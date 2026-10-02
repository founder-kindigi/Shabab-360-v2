"""Render reviewed capability/route dispositions over the fresh syntax inventory."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs/delivery/consolidation"
data = json.loads((OUT / "C2_02_INVENTORY.json").read_text())
main, v2 = data["catalogues"]["main"], data["catalogues"]["v2"]
capabilities = []
lines = ["# Capability reconciliation", "", "2026-09-12. Proposed 41-key canonical catalogue; no permission has been granted or migrated. Preserve v2 defaults for all shared identifiers and its dedicated staff-attendance capability. Restore six dedicated main Teams/Media identifiers with their historical defaults, subject to the stricter resource/membership rules in C2_02_CONTRACTS.md. Implementation must deploy the new guards, deny handling and resolver checks together; adding identifiers alone is not enablement.", "", "| Capability | Main defaults | V2 defaults | Canonical defaults | User override | Decision |", "| --- | --- | --- | --- | --- | --- |"]
for name in sorted(set(main["capabilities"]) | set(v2["capabilities"])):
    old = [r for r, caps in main["defaults"].items() if name in caps]
    current = [r for r, caps in v2["defaults"].items() if name in caps]
    added = name not in v2["capabilities"]
    defaults = old if added else current
    allowed = name in (main["userOverrides"] if added else v2["userOverrides"])
    decision = "restore dedicated identifier; never alias to organisation.*" if added else "retain v2 identifier/defaults/override eligibility"
    entry = {"capability": name, "mainDefaults": old, "v2Defaults": current, "canonicalDefaults": defaults, "userOverrideAllowed": allowed,
             "disposition": decision, "mainOnly": added, "evidence": [f"{b}:src/lib/auth/capabilities.ts:{d['lines']['ACCESS_CAPABILITIES']}" for b,d in data['catalogues'].items()],
             "contract": "C21", "implementationVerified": False}
    if name.startswith("media."): entry["contract"] = "C01"
    elif name.startswith("teams."): entry["contract"] = "C15"
    capabilities.append(entry)
    cells = [name, ", ".join(old) or "none", ", ".join(current) or "none", ", ".join(defaults) or "none", "allow/deny" if allowed else "not user-overridable", decision]
    lines.append("| " + " | ".join(cells) + " |")
lines += ["", "## Override and scope reconciliation", "",
"Keep the existing resolver precedence for a recognized capability: active user override → role override → role default. An invalid active effect denies; expired/revoked user overrides do not apply; lookup failure denies. This does not change the deliberate ability of a valid active user allow to override a role-level deny. ‘Preserve deny’ means preserving this resolved decision on every canonical and legacy endpoint, not inventing a new precedence rule. Evidence: both `src/lib/auth/capabilities.ts` resolveEffectiveCapability and v2 `src/lib/auth/capability-access.ts:18–49`.", "",
"Keep v2's protected administration boundary. Main's program_admin default access.scope.manage is not restored. Super Admin identity/default protection, disallowed access.* role edits, restricted user-override allowlist, audited reasons/expiry/revocation and transactional token invalidation remain as implemented in v2 admin/access routes. Neither Teams membership administration nor Media brief administration becomes individually overridable; their workspace capabilities may use the reviewed allowlist, always intersected with resource scope/membership.", "",
"During data reconciliation preserve original IDs, source branch/system, role/user identity, original capability/effect, expiry and revocation timestamps. Shared identifiers map one-to-one. The six restored identifiers map to themselves, not broader organisation flags. If both source datasets contain the same logical override key, retain both provenance records in a restricted reconciliation hold until one explicit decision exists; do not overwrite by import order or merge people by display name/email. No unknown-key allow may become effective. Unknown capability records stay recoverable and inactive; runtime catalogue validation must precede lookup. No inferred role grant from an old UI button or schema field.", "",
"Desired implementation cases: all 41 known keys, unknown key even with stored allow, malformed effect, expired/revoked override, database lookup failure, unchanged active-user precedence, same-key collision hold, token invalidation, foreign hierarchy and denied canonical/legacy aliases. The capability list is a contract decision, not execution evidence. Full source role arrays and literal guards are retained in C2_02_INVENTORY.json."]
(OUT / "C2_02_CAPABILITIES.md").write_text("\n".join(lines)+"\n", encoding="utf-8")

def clause(p):
    u=p.removeprefix("src/app").removesuffix("/route.ts")
    if "/admin/access/" in u: return "C21"
    if "/admin/media/" in u: return "C01"
    if u=="/api/search": return "C02"
    if "/registrations" in u or "/eligible-participants" in u: return "C07"
    if "/admin/events" in u:
        return "C08" if any(x in u for x in ["/assignees","/responsibilities","/teams","/planner-items"]) else "C06"
    if "/staff-attendance" in u or u.endswith("/staff"): return "C10"
    if "/content-planner/" in u: return "C16"
    if "/calling/" in u: return "C13"
    if "/mashwara" in u: return "C14"
    if "/teams" in u or "/collaboration-teams" in u: return "C15"
    if "/admissions" in u: return "C05"
    if "/reports/" in u: return "C11"
    if "/attendance" in u or u.endswith("/dropout"): return "C19" if u.startswith("/api/student/") else "C09"
    if u.endswith("/schedule"): return "C12"
    if u.endswith("/dashboard"): return "C19" if u.startswith(("/api/guardian/","/api/student/")) else "C11"
    if "/fees" in u: return "C18"
    if "/certificates/" in u or u=="/api/announcements": return "C20"
    if u.endswith("/account") or "/invite" in u or "/import/" in u or "/admin/users/" in u or u=="/api/user/profile": return "C03"
    if "/admin/students" in u or "/admin/guardians" in u: return "C04"
    if any(x in u for x in ["/batches","/cities","/groups","/parks","/park/participants","/park/roster","/park/guardians"]): return "C17"
    raise ValueError("No reviewed clause: "+p)

selected = {r["path"] for r in data["conflicts"]}
for p in data["routes"]:
    if any(x in p for x in ["/events/","/staff-attendance/","/calling/","/content-planner/","/mashwara/","/teams/","/access/"]) or p=="src/app/api/admin/students/[id]/profile/route.ts": selected.add(p)
conflicts = {r["path"] for r in data["conflicts"]}
rows = []
lines = ["# Endpoint reconciliation register", "", "Each route-file entry below records every exported HTTP function in the selected sources, canonical path/adapter disposition and a reviewed C00–C21 contract. Pair it with C2_02_CONTRACTS.md for schema/authority/output/error/transaction rules. Source references point to actual method declarations; the inventory retains per-method guard, parse, persistence and response call anchors. The 107 C1 conflicts are all included, with additional direct counterparts needed to reconcile the same services. This is a future contract register, not implemented-route or exhaustive consumer verification.", "", "Literal consumer matches include fetch wrappers. Indirect/dynamically assembled calls may not be found. A missing match means no literal caller detected, not proof of no usage; direct APIs remain accounted for and need future direct-route acceptance. The complete 583-site source call index permits further tracing before frontend implementation.", ""]
for p in sorted(selected):
    sources=data["routes"][p]; c=clause(p); chosen=sources.get("v2",sources.get("main")); canonical=chosen["url"]
    disposition="retain v2 path/shape except explicit clause changes" if "v2" in sources else "restore main endpoint under reviewed clause"
    if "[participantId]/profile" in p: canonical=canonical.replace("[participantId]","[id]");disposition="one [id] filesystem route; same public URL, no duplicate dynamic segment"
    if canonical.startswith("/api/events/"): canonical=canonical.replace("/api/events/","/api/admin/events/",1);disposition="legacy adapter to canonical registration service; reject client flags/action check-in"
    if "/collaboration-teams" in canonical: canonical=canonical.replace("/collaboration-teams","/teams").replace("[teamId]","[id]");disposition="legacy adapter; same Teams capability, scope and lifecycle service"
    if "/teams/members/[membershipId]" in canonical:canonical="/api/admin/teams/[id]/members/[memberId]";disposition="resolve legacy membership ID to scoped team/member; same conditional end service"
    if p.endswith("/attendance/[eventId]/staff/route.ts"): disposition="legacy historical GET adapter; POST gated until explicit canonical staff-session mapping"
    source_refs=[f"{b}:{p}:{m['line']} {m['method']}" for b,x in sources.items() for m in x["methods"]]
    if not source_refs:raise ValueError("Export method not indexed: "+p)
    # Match complete literal/template pathname; '?' begins query parameters.
    matches=[]
    for consumer in data["consumers"]:
        request=consumer["request"].strip('`"\'')
        if not request.startswith("/api/"):continue
        request=re.sub(r"\$\{[^}]*\}","__PARAM__",request).split('?')[0]
        pattern=re.escape(request).replace("__PARAM__","[^/]+")
        for x in sources.values():
            sample=re.sub(r"\[[^]]+\]","PARAM",x["url"])
            if re.fullmatch(pattern,sample):matches.append(consumer);break
    consumer_refs=sorted({f"{r['variant']}:{r['path']}:{r['line']} ({r['call']})" for r in matches})
    row={"sourcePath":p,"c1Conflict":p in conflicts,"contract":c,"canonicalPath":canonical,"disposition":disposition,
         "sourceMethods":{b:[m['method'] for m in x['methods']] for b,x in sources.items()},"sourceEvidence":source_refs,
         "sourceHashes":{b:x['sha256'] for b,x in sources.items()},"literalConsumers":consumer_refs,
         "consumerLimit":"literal-call matching, not a complete runtime call graph", "implementationVerified":False}
    rows.append(row)
    lines += [f"## {p.removeprefix('src/app').removesuffix('/route.ts')}","",f"**{c} / C00** — {disposition}. Canonical: `{canonical}`.","", "Source methods: "+"; ".join(f"{b}: {', '.join(ms)}" for b,ms in row["sourceMethods"].items())+".","", "Evidence: "+"; ".join(f"`{r}`" for r in source_refs)+".","", "Literal consumers: "+("; ".join(f"`{r}`" for r in consumer_refs) if consumer_refs else "none detected; retain direct-API acceptance and trace indirect consumers before implementation")+".",""]
(OUT/"C2_02_ENDPOINTS.md").write_text("\n".join(lines),encoding="utf-8")
(OUT/"C2_02_REGISTER.json").write_text(json.dumps({"capabilities":capabilities,"endpoints":rows,"counts":{"capabilities":len(capabilities),"endpoints":len(rows),"conflicts":len(conflicts)},"meaning":"Reviewed proposed dispositions; no runtime equivalence or fix verification"},indent=2)+"\n",encoding="utf-8")
print(json.dumps({"capabilities":len(capabilities),"routeFiles":len(rows),"c1Conflicts":len(conflicts),"withoutLiteralConsumer":sum(not r['literalConsumers'] for r in rows)}))
