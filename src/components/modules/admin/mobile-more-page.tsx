"use client";
import { useSession, signOut } from "next-auth/react";
import { useEffectiveCapabilities } from "@/hooks/use-effective-capabilities";
import { canOpenScreen } from "@/lib/auth/screen-access";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
const links = [ ["student-profile", "Student profiles"], ["parks", "Parks"], ["admissions", "Admissions"], ["calling", "Calling"], ["mashwara", "Meetings"], ["fees", "Fees"], ["certificates", "Certificate previews"], ["content-planner", "Content planner"], ["sync", "Attendance sync"], ["events", "Events"], ["knowledge-base", "Knowledge base"], ["procurement", "Procurement"], ["security-access", "Access management"], ["portal-import", "Import status"], ["teams", "Teams"], ["custom-reports", "Reports"], ["staff-directory", "Staff directory"], ["audit-log", "Audit log"], ["notifications", "Notifications"] ];
export function MobileMorePage({ onNavigate }: { onNavigate: (screen: string) => void; role?: string }) {
  const { data: session } = useSession(); const access = useEffectiveCapabilities(); const { theme, setTheme } = useTheme();
  const role = session?.user?.role ?? "";
  return <section className="max-w-xl mx-auto p-5 pb-28 space-y-4"><h1 className="text-2xl font-bold">More</h1><p>{session?.user?.name ?? ""}</p>
    {access.isLoading ? <p>Loading available tools…</p> : access.isError ? <p role="alert">Permissions could not be loaded. <button onClick={() => access.refetch()}>Retry</button></p> : <nav className="grid gap-2">{links.filter(([screen]) => canOpenScreen(screen, role, access.has)).map(([screen, label]) => <Button key={screen} variant="outline" className="justify-start" onClick={() => onNavigate(screen)}>{label}</Button>)}</nav>}
    <label className="block">Appearance on this device<select className="block w-full p-2 border rounded" value={theme} onChange={e => setTheme(e.target.value as "light" | "dark" | "system")}><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select></label>
    <p className="text-sm text-muted-foreground">Database backup, restore, roster import, and program settings are currently unavailable here.</p>
    <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
  </section>;
}
