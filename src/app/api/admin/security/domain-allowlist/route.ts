import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit";
import {
  getDomainAllowlistConfig,
  updateDomainAllowlistConfig,
  validateExternalURL,
} from "@/lib/security/domain-allowlist";
import { z } from "zod";

const updateAllowlistSchema = z.object({
  allowedDomains: z.array(z.string().trim().min(1)).optional(),
  requireInterstitialWarning: z.boolean().optional(),
  blockAllUnlisted: z.boolean().optional(),
});

const validateUrlSchema = z.object({
  url: z.string().trim().url(),
});

export async function GET(request: NextRequest) {
  const auth = await requireCapability("organisation.view");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const testUrl = url.searchParams.get("testUrl");

  const config = getDomainAllowlistConfig();

  if (testUrl) {
    const validation = validateExternalURL(testUrl);
    return NextResponse.json({ config, validation });
  }

  return NextResponse.json(config);
}

export async function POST(request: NextRequest) {
  const auth = await requireCapability("organisation.manage");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  const body = await request.json().catch(() => ({}));

  // Check if testing a single URL validation
  if (body.url && typeof body.url === "string") {
    const parseUrl = validateUrlSchema.safeParse(body);
    if (!parseUrl.success) {
      return NextResponse.json(
        { error: "Invalid URL provided", details: parseUrl.error.format() },
        { status: 400 }
      );
    }
    const validation = validateExternalURL(parseUrl.data.url);
    return NextResponse.json({ validation });
  }

  const parsed = updateAllowlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const updatedConfig = updateDomainAllowlistConfig(parsed.data);

  logAudit({
    userId: user.id,
    action: "update",
    entityType: "domain_allowlist_config",
    entityId: "global_allowlist",
    newValues: {
      allowedDomainsCount: updatedConfig.allowedDomains.length,
      requireInterstitialWarning: updatedConfig.requireInterstitialWarning,
      blockAllUnlisted: updatedConfig.blockAllUnlisted,
    },
  });

  return NextResponse.json(updatedConfig);
}
