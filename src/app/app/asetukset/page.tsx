import { cookies } from "next/headers";
import { currentUser, db } from "@/lib/supabase/rest";
import { SettingsPanel } from "@/components/app/settings-panel";
type Membership = { user_id: string; role: "owner" | "admin" | "analyst" | "viewer"; status: string; created_at: string };
type Invite = { id: string; invited_email: string; role: string; state: string; expires_at: string };
export default async function Settings() {
  const user = await currentUser();
  if (!user) return <div className="workspace-card">Kirjaudu sisään.</div>;
  try {
    const memberships = await db<{ org_id: string; role: Membership["role"]; organizations: { name: string } }[]>("memberships?select=org_id,role,organizations(name)&user_id=eq." + user.id + "&status=eq.active");
    const choice = (await cookies()).get("elarventis-org")?.value;
    const active = memberships.find(item => item.org_id === choice) || memberships[0];
    if (!memberships.length) return <div className="workspace-card">Sinulla ei ole pääsyä tähän yritystyötilaan.</div>;
    const orgId = active.org_id;
    const role = active.role;
    const [members, profile, invites] = await Promise.all([
      db<Membership[]>("memberships?select=user_id,role,status,created_at&org_id=eq." + orgId + "&status=eq.active&order=created_at.asc"),
      db<{ display_name: string | null }[]>("profiles?select=display_name&user_id=eq." + user.id),
      ["owner", "admin"].includes(role) ? db<Invite[]>("invitations?select=id,invited_email,role,state,expires_at&org_id=eq." + orgId + "&order=created_at.desc") : Promise.resolve([]),
    ]);
    return <SettingsPanel orgId={orgId} orgName={active.organizations.name} role={role} members={members} invites={invites} userId={user.id} email={user.email} displayName={profile[0]?.display_name || ""} />;
  } catch { return <div className="workspace-card" role="alert">Yrityksen asetuksia ei voitu ladata. Yritä myöhemmin uudelleen.</div>; }
}
