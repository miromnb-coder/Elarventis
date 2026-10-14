import { cookies } from "next/headers";
import { Empty } from "@/components/app/shell";
import { currentUser, db } from "@/lib/supabase/rest";
import { WorkspaceForm } from "@/components/app/workspace-form";
export default async function Dashboard() {
  const user = await currentUser();
  if (!user) return <Empty title="Kirjaudu sisään" text="Istunto ei ole käytettävissä." />;
  let memberships: { org_id: string; organizations: { name: string } }[] = [];
  try { memberships = await db(`memberships?select=org_id,organizations(name)&user_id=eq.${user.id}&status=eq.active`); } catch { return <Empty title="Tietokantayhteys puuttuu" text="Sovelluksen migraatio ja ympäristömuuttujat on otettava käyttöön." />; }
  const choice = (await cookies()).get("elarventis-org")?.value;
  const org = memberships.find(m => m.org_id === choice) || memberships[0];
  if (!org) return <div className="workspace-stack"><div><p className="workspace-kicker">ALOITA TÄSTÄ</p><h1>Luo yrityksen työtila</h1><p>Työtila pitää yrityksen sopimukset ja dokumentit erillään muista yrityksistä.</p></div><WorkspaceForm /></div>;
  const orgId = org.org_id;
  const [contracts, versions] = await Promise.all([
    db<{ id: string }[]>("contracts?select=id&org_id=eq." + orgId),
    db<{ id: string; state: string }[]>("contract_versions?select=id,state&org_id=eq." + orgId),
  ]);
  return <div className="workspace-stack"><div><p className="workspace-kicker">YLEISKATSAUS</p><h1>Hyvää päivää.</h1><p>{org.organizations.name} · Sopimusten ja hinnastojen hallinta.</p></div><div className="workspace-stats"><div><span>Sopimukset</span><strong>{contracts.length}</strong></div><div><span>Hyväksytyt hinnastoversiot</span><strong>{versions.filter(v => v.state === "approved").length}</strong></div><div><span>Tarkistettavat versiot</span><strong>{versions.filter(v => v.state === "pending_review").length}</strong></div><div><span>Käsitellyt laskut</span><strong>—</strong><small>Laskunkäsittely ei ole vielä käytössä</small></div></div><Empty title="Ei vielä tarkastustapahtumia" text="Laskujen tarkastus ja mahdollisten hintaerojen laskenta toteutetaan myöhemmässä vaiheessa." /></div>;
}
