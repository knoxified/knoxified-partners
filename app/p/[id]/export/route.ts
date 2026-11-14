import { NextResponse, type NextRequest } from "next/server";
import { canView, getViewer } from "@/lib/viewer";
import { getCustomers, getPartner, getPayments } from "@/lib/data";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!canView(viewer, id)) return new NextResponse("Not found", { status: 404 });

  const partner = await getPartner(id);
  if (!partner) return new NextResponse("Not found", { status: 404 });

  const type = request.nextUrl.searchParams.get("type") === "customers" ? "customers" : "payments";
  const isAdmin = viewer?.role === "admin";

  let rows: Array<Record<string, unknown>>;
  if (type === "customers") {
    rows = (await getCustomers(id, isAdmin)).map((c) => ({
      customer: c.business_name, ref: c.customer_key, location: c.location ?? "", plan: c.plan_name, status: c.status,
      signed_up: c.signed_up_at?.slice(0, 10), first_paid: c.first_paid_at?.slice(0, 10) ?? "",
      payments: c.payments, commission_earned: c.total_commission,
      ...(isAdmin ? { owner: c.full_name ?? "", email: c.email ?? "" } : {}),
    }));
  } else {
    rows = (await getPayments(id)).map((p) => ({
      paid_on: p.paid_at.slice(0, 10), customer: p.business_name, ref: p.customer_key ?? "", plan: p.plan_name ?? "",
      commission_base: p.commission_base, rate_percent: p.rate_percent, commission: p.commission_amount,
      status: p.status, payable_on: p.payable_on, scheduled_payout: p.scheduled_payout,
      paid_out_on: p.paid_out_at?.slice(0, 10) ?? "", payout_ref: p.payout_ref ?? "", note: p.note ?? "",
    }));
  }

  const slug = partner.ref_code.replace(/[^a-z0-9_-]/gi, "");
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="knoxified-${slug}-${type}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
