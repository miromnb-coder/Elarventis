import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ContractDetail } from "@/components/app/contract-detail";
import { currentUser, db } from "@/lib/supabase/rest";
export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await currentUser();
  if (!user) notFound();
  const memberships = await db<{ org_id: string; role: string }[]>(`memberships?select=org_id,role&user_id=eq.${user.id}&status=eq.active`);
  const choice = (await cookies()).get("elarventis-org")?.value;
  const member = memberships.find(m => m.org_id === choice) || memberships[0];
  if (!member) notFound();
  const orgId = member.org_id;
  const contracts = await db<{ id: string; label: string; carriers: { name: string } }[]>("contracts?select=id,label,carriers(name)&id=eq." + id + "&org_id=eq." + orgId);
  if (!contracts.length) notFound();
  const versions = await db<{ id: string; version_number: number; effective_from: string; effective_to: string | null; state: string; approved_at: string | null; document_id: string | null }[]>("contract_versions?select=id,version_number,effective_from,effective_to,state,approved_at,document_id&contract_id=eq." + id + "&org_id=eq." + orgId + "&order=version_number.desc");
  const rates = versions[0] ? await db<{ id: string; service_code: string; zone: string; min_weight_g: number; max_weight_g: number; price_minor: number; vat_basis: string; source_row: number }[]>("rate_rules?select=id,service_code,zone,min_weight_g,max_weight_g,price_minor,vat_basis,source_row&contract_version_id=eq." + versions[0].id + "&org_id=eq." + orgId + "&order=source_row") : [];
  return <ContractDetail contract={contracts[0]} versions={versions} rates={rates} canEdit={member.role === "owner" || member.role === "admin"} />;
}
