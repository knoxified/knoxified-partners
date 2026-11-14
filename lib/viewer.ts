import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export type Viewer = {
  userId: string;
  email: string;
  role: "admin" | "partner" | "none";
  partnerId: string | null;
};

// Who is looking? Decided from the login session and the database, never from the URL.
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = adminClient();
  const [adminRow, memberRow] = await Promise.all([
    admin.from("portal_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    admin.from("partner_members").select("partner_id").eq("user_id", user.id).maybeSingle(),
  ]);

  const role = adminRow.data ? "admin" : memberRow.data ? "partner" : "none";
  return {
    userId: user.id,
    email: user.email ?? "",
    role,
    partnerId: memberRow.data?.partner_id ?? null,
  };
});

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Can this viewer see this partner's page? Admins see all; affiliates only their own.
export function canView(viewer: Viewer | null, partnerId: string): boolean {
  if (!viewer || !UUID_RE.test(partnerId)) return false;
  if (viewer.role === "admin") return true;
  return viewer.role === "partner" && viewer.partnerId === partnerId;
}
