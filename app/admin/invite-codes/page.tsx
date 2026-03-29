import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppHeader } from "@/app/components/header";
import { Breadcrumb } from "@/app/components/breadcrumb";
import { getUnusedInviteCodes } from "@/app/actions/invite-codes";
import { InviteCodeList } from "./invite-code-list";

export default async function InviteCodesPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/dashboard");

  const { data: codes, error } = await getUnusedInviteCodes();

  const grouped: Record<string, Array<{ id: string; code: string; role: string; created_at: string }>> = {};
  if (codes) {
    for (const code of codes) {
      if (!grouped[code.role]) grouped[code.role] = [];
      grouped[code.role].push(code);
    }
  }

  return (
    <main className="dashboard">
      <AppHeader username={profile.username} role={profile.role} />

      <div className="dashboard-content">
        <Breadcrumb
          items={[
            { label: "Admin", href: "/admin" },
            { label: "Invite-Codes ansehen", href: "/admin/invite-codes" },
          ]}
        />

        <div className="dashboard-welcome">
          <h2>Invite-Codes</h2>
          <p>Verfügbare (unbenutzte) Einladungscodes nach Rolle sortiert.</p>
        </div>

        {error && <div className="form-error">{error}</div>}

        <InviteCodeList grouped={grouped} />
      </div>
    </main>
  );
}
