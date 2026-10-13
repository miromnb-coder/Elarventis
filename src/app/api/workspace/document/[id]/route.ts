import { NextRequest, NextResponse } from "next/server";
import { currentUser, db, storage } from "@/lib/supabase/rest";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await currentUser()) return NextResponse.json({ error: "Kirjautuminen vaaditaan" }, { status: 401 });
  const { id } = await params; const orgId = request.cookies.get("elarventis-org")?.value;
  if (!orgId || !uuid.test(orgId) || !uuid.test(id)) return NextResponse.json({ error: "Dokumenttia ei löytynyt" }, { status: 404 });
  try {
    const documents = await db<{ storage_path: string; mime: string; original_name: string }[]>("documents?select=storage_path,mime,original_name&org_id=eq." + orgId + "&id=eq." + id + "&state=eq.stored");
    if (!documents.length) return NextResponse.json({ error: "Dokumenttia ei löytynyt" }, { status: 404 });
    const result = await storage("authenticated/elarventis-documents/" + documents[0].storage_path);
    if (!result.ok) return NextResponse.json({ error: "Dokumentin lataus epäonnistui" }, { status: 404 });
    return new NextResponse(result.body, { headers: { "Content-Type": documents[0].mime, "Content-Disposition": "inline; filename=\"document\"", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return NextResponse.json({ error: "Dokumentin lataus epäonnistui" }, { status: 404 }); }
}
