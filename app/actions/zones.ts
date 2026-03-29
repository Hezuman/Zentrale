"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getZonesForBed(raisedBedId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("raised_bed_zones")
    .select("*")
    .eq("raised_bed_id", raisedBedId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching zones:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getRaisedBed(id: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("raised_beds")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error) {
    console.error("Error fetching raised bed:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function createZone(params: {
  raised_bed_id: string;
  x_cm: number;
  y_cm: number;
  width_cm: number;
  height_cm: number;
  plant_type?: string | null;
  plant_count?: number | null;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht authentifiziert." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "family", "close_friends", "friends"].includes(profile.role)) {
    return { error: "Keine Berechtigung." };
  }

  // Validation
  if (params.width_cm <= 0 || params.height_cm <= 0) {
    return { error: "Breite und Höhe müssen größer als 0 sein." };
  }

  if (params.x_cm < 0 || params.y_cm < 0) {
    return { error: "Position darf nicht negativ sein." };
  }

  const insertData: any = {
    raised_bed_id: params.raised_bed_id,
    x_cm: Math.round(params.x_cm),
    y_cm: Math.round(params.y_cm),
    width_cm: Math.round(params.width_cm),
    height_cm: Math.round(params.height_cm),
    created_by: user.id,
  };

  if (params.plant_type) {
    insertData.plant_type = params.plant_type;
    insertData.plant_count = params.plant_count && params.plant_count >= 1 ? params.plant_count : 1;
  }

  const { error } = await supabase.from("raised_bed_zones").insert(insertData);

  if (error) {
    console.error("Error creating zone:", error);
    if (error.message.includes("overlap")) {
      return { error: "Zone überlappt mit einer bestehenden Zone." };
    }
    if (error.message.includes("boundaries")) {
      return { error: "Zone ragt über die Grenzen des Hochbeets hinaus." };
    }
    return { error: "Zone konnte nicht erstellt werden." };
  }

  revalidatePath(`/hochbeete`);
  return { error: null };
}

export async function updateZone(params: {
  id: string;
  plant_type?: string | null;
  plant_count?: number | null;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht authentifiziert." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "family", "close_friends", "friends"].includes(profile.role)) {
    return { error: "Keine Berechtigung." };
  }

  const updateData: any = {};

  if (params.plant_type) {
    updateData.plant_type = params.plant_type;
    updateData.plant_count = params.plant_count && params.plant_count >= 1 ? params.plant_count : 1;
  } else {
    updateData.plant_type = null;
    updateData.plant_count = null;
  }

  const { error } = await supabase
    .from("raised_bed_zones")
    .update(updateData)
    .eq("id", params.id);

  if (error) {
    console.error("Error updating zone:", error);
    return { error: "Zone konnte nicht aktualisiert werden." };
  }

  revalidatePath(`/hochbeete`);
  return { error: null };
}

export async function deleteZone(id: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht authentifiziert." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Nur Administratoren können Zonen löschen." };
  }

  const { error } = await supabase
    .from("raised_bed_zones")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting zone:", error);
    return { error: "Zone konnte nicht gelöscht werden." };
  }

  revalidatePath(`/hochbeete`);
  return { error: null };
}
