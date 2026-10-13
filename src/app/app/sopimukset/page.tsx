import { cookies } from "next/headers";
import { Contracts } from "@/components/app/contracts";
import { Empty } from "@/components/app/shell";
import { db } from "@/lib/supabase/rest";
export default async function ContractsPage() {
  const memberships = await db<{ org_id: string }[]>("memberships?select=org_id&status=eq.active");
  const choice = (await cookies()).get("elarventis-org")?.value;
  const orgId = memberships.find(m => m.org_id === choice)?.org_id || memberships[0]?.org_id;
  if (!orgId) return <Empty title="Työtila puuttuu" text="Luo ensin yrityksen työtila yleiskatsauksessa." />;
  const [carriers, contracts] = await Promise.all([
    db<{ id: string; name: string }[]>("carriers?select=id,name&org_id=eq." + orgId + "&archived_at=is.null&order=name"),
    db<{ id: string; label: string; state: string; updated_at: string; carriers: { name: string }; contract_versions: { version_number: number; state: string }[] }[]>("contracts?select=id,label,state,updated_at,carriers(name),contract_versions(version_number,state)&org_id=eq." + orgId + "&order=updated_at.desc"),
  ]);
  return <Contracts carriers={carriers} contracts={contracts} />;
}
