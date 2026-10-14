import { NextRequest, NextResponse } from "next/server";
import { currentUser, db } from "@/lib/supabase/rest";
import { persistAudit } from "@/lib/audit-engine/persist";
import type { AuditInput, Charge, PriceRule } from "@/lib/audit-engine";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Line = { id:string; shipment_ref:string|null; service_code:string|null; service_date:string|null; charge_type:Charge; billed_minor:number; vat_basis:"including_vat"|"excluding_vat"; weight_g:number|null; zone:string|null; review_state:string; source_row:number|null; source_page:number|null };
type Version = { id:string; contract_id:string; state:"approved"; effective_from:string; effective_to:string|null };
type Rule = { id:string; contract_version_id:string; rule_type:PriceRule["type"]; service_code:string; zone:string|null; min_weight_g:number|null; max_weight_g:number|null; price_minor:number; vat_basis:PriceRule["vatBasis"]; effective_from:string|null; effective_to:string|null; source_document_id:string|null; source_row:number|null };
export async function POST(request:NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({error:"Virheellinen alkuperä"},{status:403});
  const user=await currentUser();
  if (!user) return NextResponse.json({error:"Kirjautuminen vaaditaan"},{status:401});
  const org=request.cookies.get("elarventis-org")?.value;
  const {invoiceId}=await request.json().catch(()=>({}));
  if (!org || !uuid.test(org) || typeof invoiceId!=="string" || !uuid.test(invoiceId)) return NextResponse.json({error:"Virheellinen pyyntö"},{status:400});
  try {
    const roles=await db<{role:string}[]>(`memberships?select=role&org_id=eq.${org}&user_id=eq.${user.id}&status=eq.active`);
    if (!roles.some(r=>["owner","admin","analyst"].includes(r.role))) return NextResponse.json({error:"Ei käyttöoikeutta"},{status:403});
    const invoices=await db<{carrier_id:string;document_id:string}[]>(`invoices?select=carrier_id,document_id&org_id=eq.${org}&id=eq.${invoiceId}`);
    if (invoices.length!==1) return NextResponse.json({error:"Laskua ei löytynyt"},{status:404});
    const lines=await db<Line[]>(`invoice_lines?select=id,shipment_ref,service_code,service_date,charge_type,billed_minor,vat_basis,weight_g,zone,review_state,source_row,source_page&org_id=eq.${org}&invoice_id=eq.${invoiceId}&order=id.asc&limit=1001`);
    if (!lines.length || lines.length>1000) throw new Error("Invalid line count");
    const carriers=await db<{id:string;carrier_id:string}[]>(`contracts?select=id,carrier_id&org_id=eq.${org}&carrier_id=eq.${invoices[0].carrier_id}&limit=1000`);
    const versions=await db<Version[]>(`contract_versions?select=id,contract_id,state,effective_from,effective_to&org_id=eq.${org}&state=eq.approved&limit=1001`);
    if (versions.length>1000) throw new Error("Too many versions");
    const ids=new Set(carriers.map(c=>c.id)), selected=versions.filter(v=>ids.has(v.contract_id));
    const rules=selected.length ? await db<Rule[]>(`rate_rules?select=id,contract_version_id,rule_type,service_code,zone,min_weight_g,max_weight_g,price_minor,vat_basis,effective_from,effective_to,source_document_id,source_row&org_id=eq.${org}&contract_version_id=in.(${selected.map(v=>v.id).join(",")})&order=id.asc&limit=10001`) : [];
    if (rules.length>10000) throw new Error("Too many rules");
    const input:AuditInput={carrierId:invoices[0].carrier_id,
      lines:lines.map(l=>({id:l.id,shipmentRef:l.shipment_ref??undefined,serviceCode:l.service_code??undefined,serviceDate:l.service_date??undefined,charge:l.charge_type,billedMinor:Number(l.billed_minor),vatBasis:l.vat_basis,weightG:l.weight_g??undefined,zone:l.zone??undefined,reviewed:l.review_state==="approved",source:{documentId:invoices[0].document_id,row:l.source_row??undefined,page:l.source_page??undefined}})),
      contracts:selected.map(v=>({id:v.id,carrierId:invoices[0].carrier_id,state:v.state,effectiveFrom:v.effective_from,effectiveTo:v.effective_to??undefined,
        rules:rules.filter(r=>r.contract_version_id===v.id).map(r=>({id:r.id,type:r.rule_type,serviceCode:r.service_code,zone:r.zone??undefined,minWeightG:r.min_weight_g??undefined,maxWeightG:r.max_weight_g??undefined,priceMinor:r.price_minor,vatBasis:r.vat_basis,effectiveFrom:r.effective_from??undefined,effectiveTo:r.effective_to??undefined,source:{documentId:r.source_document_id??invoices[0].document_id,row:r.source_row??undefined}}))}))};
    const result=await persistAudit(org,invoiceId,user.id,input);
    return NextResponse.json(result);
  } catch {return NextResponse.json({error:"Tarkastus epäonnistui"},{status:422});}
}
