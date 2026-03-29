"use server";

import { createClient } from "@/lib/supabase/server";

export async function validateInviteCode(code: string) {
  if (!code || code.trim().length === 0) {
    return { valid: false, role: null };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("validate_invite_code", {
    invite_code: code.trim(),
  });

  if (error || !data || data.length === 0) {
    return { valid: false, role: null };
  }

  return { valid: true, role: data[0].assigned_role as string };
}

export async function getUnusedInviteCodes() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "Nicht authentifiziert." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { data: null, error: "Keine Berechtigung." };
  }

  const { data, error } = await supabase
    .from("invite_codes")
    .select("id, code, role, created_at")
    .eq("is_active", true)
    .is("used_by", null)
    .order("role")
    .order("created_at", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}
