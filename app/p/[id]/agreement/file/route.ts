import { NextResponse, type NextRequest } from "next/server";
import { canView, getViewer } from "@/lib/viewer";
import { adminClient } from "@/lib/supabase/admin";
import { fromB64 } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!canView(viewer, id)) return new NextResponse("Not found", { status: 404 });
  const { data } = await adminClient()
    .from("partner_agreements")
    .select("record_html, record_json, tsa_token_b64")
    .eq("partner_id", id)
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return new NextResponse("Not found", { status: 404 });

  const type = request.nextUrl.searchParams.get("type");
  const common = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  const printable = (html: string) =>
    html.replace("</body>", `<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},400)})</script></body>`);

  // The PDF is a convenience copy made by the browser's "Save as PDF". The stored HTML file is the
  // fingerprinted original; this route only adds the print prompt to the copy it serves.
  if (type === "print")
    return new NextResponse(printable(data.record_html), { headers: { ...common, "Content-Type": "text/html; charset=utf-8" } });

  if (type === "addendum" || type === "addendum-json" || type === "addendum-tsr" || type === "addendum-print") {
    const { data: ad } = await adminClient()
      .from("partner_signature_addenda")
      .select("record_html, record_json, tsa_token_b64")
      .eq("partner_id", id)
      .order("signed_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!ad) return new NextResponse("Not found", { status: 404 });
    if (type === "addendum-json")
      return new NextResponse(JSON.stringify(ad.record_json, null, 2), { headers: { ...common, "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="knoxified-signature-addendum.json"' } });
    if (type === "addendum-tsr") {
      if (!ad.tsa_token_b64) return new NextResponse("Timestamp not ready", { status: 404 });
      return new NextResponse(fromB64(ad.tsa_token_b64) as BodyInit, { headers: { ...common, "Content-Type": "application/timestamp-reply", "Content-Disposition": 'attachment; filename="knoxified-signature-addendum.tsr"' } });
    }
    if (type === "addendum-print") return new NextResponse(printable(ad.record_html), { headers: { ...common, "Content-Type": "text/html; charset=utf-8" } });
    return new NextResponse(ad.record_html, { headers: { ...common, "Content-Type": "text/html; charset=utf-8", "Content-Disposition": 'attachment; filename="knoxified-signature-addendum.html"' } });
  }
  if (type === "json")
    return new NextResponse(JSON.stringify(data.record_json, null, 2), {
      headers: { ...common, "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="knoxified-affiliate-agreement.json"' },
    });
  if (type === "tsr") {
    if (!data.tsa_token_b64) return new NextResponse("Timestamp not ready", { status: 404 });
    return new NextResponse(fromB64(data.tsa_token_b64) as BodyInit, {
      headers: { ...common, "Content-Type": "application/timestamp-reply", "Content-Disposition": 'attachment; filename="knoxified-affiliate-agreement.tsr"' },
    });
  }
  return new NextResponse(data.record_html, {
    headers: { ...common, "Content-Type": "text/html; charset=utf-8", "Content-Disposition": 'attachment; filename="knoxified-affiliate-agreement.html"' },
  });
}
