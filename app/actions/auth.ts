"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const supabase = createClient();

  const username = (formData.get("username") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Benutzername und Passwort sind erforderlich." };
  }

  // Supabase requires email for auth – we use username@zentrale.local as internal mapping
  const internalEmail = `${username}@zentrale.local`;

  const { error } = await supabase.auth.signInWithPassword({
    email: internalEmail,
    password,
  });

  if (error) {
    return { error: "Ungültiger Benutzername oder Passwort." };
  }

  redirect("/dashboard");
}

export async function register(formData: FormData) {
  const supabase = createClient();

  const inviteCode = (formData.get("inviteCode") as string)?.trim();
  const username = (formData.get("username") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const passwordConfirm = formData.get("passwordConfirm") as string;

  if (!inviteCode || !username || !password || !passwordConfirm) {
    return { error: "Alle Felder müssen ausgefüllt werden." };
  }

  if (password !== passwordConfirm) {
    return { error: "Passwörter stimmen nicht überein." };
  }

  if (password.length < 8) {
    return { error: "Passwort muss mindestens 8 Zeichen lang sein." };
  }

  if (!/^[a-z0-9_-]+$/.test(username)) {
    return {
      error:
        "Benutzername darf nur Kleinbuchstaben, Zahlen, Bindestriche und Unterstriche enthalten.",
    };
  }

  if (username.length < 3 || username.length > 30) {
    return { error: "Benutzername muss zwischen 3 und 30 Zeichen lang sein." };
  }

  // 1. Validate invite code via server-side function
  const { data: codeData, error: codeError } = await supabase.rpc(
    "validate_invite_code",
    { invite_code: inviteCode }
  );

  if (codeError || !codeData || codeData.length === 0) {
    return { error: "Ungültiger oder bereits verwendeter Einladungscode." };
  }

  const { code_id, assigned_role } = codeData[0];

  // 2. Check if username is already taken
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingProfile) {
    return { error: "Dieser Benutzername ist bereits vergeben." };
  }

  // 3. Create auth user (internal email mapping)
  const internalEmail = `${username}@zentrale.local`;

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: internalEmail,
    password,
    options: {
      data: {
        username,
        role: assigned_role,
      },
    },
  });

  if (signUpError || !authData.user) {
    return { error: "Registrierung fehlgeschlagen. Bitte versuche es erneut." };
  }

  // 4. Create profile
  const { error: profileError } = await supabase.rpc("create_profile", {
    user_id: authData.user.id,
    user_name: username,
    user_role: assigned_role,
  });

  if (profileError) {
    return { error: "Profil konnte nicht erstellt werden." };
  }

  // 5. Consume invite code
  await supabase.rpc("consume_invite_code", {
    code_id,
    user_id: authData.user.id,
  });

  redirect("/dashboard");
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}
