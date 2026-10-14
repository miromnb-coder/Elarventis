import { cookies } from "next/headers";
import { Empty } from "@/components/app/shell";
import { currentUser, db } from "@/lib/supabase/rest";
import { WorkspaceForm } from "@/components/app/workspace-form";
import Link from "next/link";
export default async function Dashboard() {
  const user = await currentUser();
  if (!user) return <Empty title="Kirjaudu sisään" text="Istunto ei ole käytettävissä." />;
  let memberships: { org_id: string; organizations: { name: string } }[] = [];
  try { memberships = await db(`memberships?select=org_id,organizations(name)&user_id=eq.${user.id}&status=eq.active`); } catch { return <Empty title="Tietokantayhteys puuttuu" text="Sovelluksen migraatio ja ympäristömuuttujat on otettava käyttöön." />; }
  const choice = (await cookies()).get("elarventis-org")?.value;
  const org = memberships.find(m => m.org_id === choice) || memberships[0];
  if (!org) return <div className="workspace-stack onboarding-page"><div><p className="workspace-kicker">TERVETULOA ELARVENTIKSEEN / 01</p><h1>Perusta yrityksesi työtila.</h1><p>Yksi selkeä paikka sopimuksille, hinnastoille ja kuljetuslaskujen tarkastuksille. Yrityksen nimi riittää aloittamiseen.</p></div><WorkspaceForm /><p className="settings-subtle">Kun työtila on luotu, voit lisätä sopimuksen ja tuoda tarkastettavan hinnaston. Kutsut avataan myöhemmin.</p></div>;
  const orgId = org.org_id;
  const [contracts, versions] = await Promise.all([
    db<{ id: string }[]>("contracts?select=id&org_id=eq." + orgId),
    db<{ id: string; state: string }[]>("contract_versions?select=id,state&org_id=eq." + orgId),
  ]);
  return <div className="workspace-stack"><div><p className="workspace-kicker">YLEISKATSAUS / {org.organizations.name.toUpperCase()}</p><h1>Työtilasi yhdessä näkymässä.</h1><p>Seuraa lähtötietojen valmistelua ja jatka seuraavaan tarkistettavaan vaiheeseen.</p></div><div className="workspace-stats"><div><span>Sopimukset</span><strong>{contracts.length}</strong></div><div><span>Hyväksytyt hinnastoversiot</span><strong>{versions.filter(v => v.state === "approved").length}</strong></div><div><span>Tarkistettavat versiot</span><strong>{versions.filter(v => v.state === "pending_review").length}</strong></div><div><span>Tarkastusten tila</span><strong>Rajattu</strong><small>Asiakaskäytön aktivointi odottaa varmennusta</small></div></div><div className="dashboard-next"><div><p className="workspace-kicker">SEURAAVAKSI</p><h2>Valmistele tarkastuksen lähtötiedot</h2><p>Lisää kuljetussopimus, tarkista hinnastoversio ja tuo lasku vasta sitten tarkastettavaksi.</p></div><div><Link className="workspace-primary" href="/app/sopimukset">Avaa sopimukset →</Link><Link href="/app/laskut">Tarkastele laskuja →</Link></div></div><Empty title="Ei vielä tarkastustapahtumia" text="Tarkastustulokset näkyvät täällä, kun yrityksesi aineisto on käsitelty." /></div>;
}
