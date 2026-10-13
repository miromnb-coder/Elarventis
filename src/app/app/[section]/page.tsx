import { notFound } from "next/navigation";
import { Empty } from "@/components/app/shell";
import { Invoices } from "@/components/app/invoices";
const pages: Record<string, { title: string; description: string }> = {
  laskut: { title: "Kuljetuslaskut", description: "Laskujen tuonti ja automaattinen tarkastus toteutetaan myöhemmässä vaiheessa." },
  hinnastot: { title: "Hinnastot", description: "Hinnastoversiot liittyvät sopimuksiin." },
  tarkastukset: { title: "Tarkastukset", description: "Laskujen tarkastus ei ole vielä käytössä." },
  poikkeamat: { title: "Poikkeamat", description: "Tarkistettavia havaintoja ei vielä ole." },
  raportit: { title: "Raportit", description: "Raportit ovat käytettävissä laskuntarkastuksen valmistuttua." },
  asetukset: { title: "Asetukset", description: "Profiilin ja työtilan asetukset." },
};
export default async function Section({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = pages[section];
  if (!page) notFound();
  if (section === "laskut") return <Invoices />;
  return <div className="workspace-stack"><div><p className="workspace-kicker">TYÖTILA / {page.title.toUpperCase()}</p><h1>{page.title}</h1><p>{page.description}</p></div><Empty title="Ei vielä tietoja" text={page.description} /></div>;
}

