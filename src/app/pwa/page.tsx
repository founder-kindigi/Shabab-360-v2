import type { Metadata, Viewport } from "next";
import { PwaApp } from "@/components/pwa/pwa-app";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shabab 360 — PWA",
  description: "Shabab 360 mobile-first progressive web application",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Shabab 360",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1F0860",
};

export default function PwaPage() {
  return <PwaApp />;
}
