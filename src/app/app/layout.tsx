import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Shell } from "@/components/app/shell";
import { currentUser, db } from "@/lib/supabase/rest";
export const dynamic = "force-dynamic";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/kirjaudu");
  let organizations: { id: string; name: string }[] = [];
  try {
    const memberships = await db<{ org_id: string; organizations: { id: string; name: string } }[]>(`memberships?select=org_id,organizations(id,name)&user_id=eq.${user.id}&status=eq.active`);
    organizations = memberships.map(item => item.organizations).filter(Boolean);
  } catch { /* Migration not yet installed; setup message is shown in page. */ }
  const choice = (await cookies()).get("elarventis-org")?.value;
  if (organizations.length && !organizations.some(item => item.id === choice)) redirect("/api/workspace/select-default");
  const active = organizations.find(item => item.id === choice)?.id || organizations[0]?.id;
  return <Shell organizations={organizations} active={active} email={user.email}>{children}</Shell>;
}
