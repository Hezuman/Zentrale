"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getRaisedBeds() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("raised_beds")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching raised beds:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function createRaisedBed(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht authentifiziert." };
  }

  // Verify admin role server-side
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Keine Berechtigung. Nur Administratoren können Hochbeete erstellen." };
  }

  const name = (formData.get("name") as string)?.trim();
  const widthCm = parseInt(formData.get("width_cm") as string, 10);
  const heightCm = parseInt(formData.get("height_cm") as string, 10);
  const description = (formData.get("description") as string)?.trim() || null;

  // Validation
  if (!name) {
    return { error: "Name ist erforderlich." };
  }

  if (!widthCm || widthCm <= 0) {
    return { error: "Breite muss größer als 0 sein." };
  }

  if (!heightCm || heightCm <= 0) {
    return { error: "Höhe muss größer als 0 sein." };
  }

  const { error } = await supabase.from("raised_beds").insert({
    name,
    width_cm: widthCm,
    height_cm: heightCm,
    description,
    created_by: user.id,
  });

  if (error) {
    console.error("Error creating raised bed:", error);
    return { error: "Hochbeet konnte nicht erstellt werden." };
  }

  revalidatePath("/hochbeete");
  return { error: null };
}
