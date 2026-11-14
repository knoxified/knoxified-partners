"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 10) redirect("/set-password?error=Use+at+least+10+characters");
  if (password !== confirm) redirect("/set-password?error=Passwords+do+not+match");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/set-password?error=" + encodeURIComponent(error.message));
  redirect("/");
}
