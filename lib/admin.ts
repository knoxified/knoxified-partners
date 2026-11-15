import "server-only";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";

export async function requireAdmin() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "admin") redirect("/");
  return viewer;
}

// Next payout date: the 15th (this month if it has not passed, otherwise next month), as YYYY-MM-DD in UTC.
export function nextPayoutDate(from = new Date()): string {
  const y = from.getUTCFullYear();
  const m = from.getUTCMonth();
  const d = from.getUTCDate();
  const target = d <= 15 ? new Date(Date.UTC(y, m, 15)) : new Date(Date.UTC(y, m + 1, 15));
  return target.toISOString().slice(0, 10);
}
