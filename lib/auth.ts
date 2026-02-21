import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

type UserRole = "member" | "organizer" | "admin";

async function ensureProfileRow(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, user: User) {
  const displayName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : "";

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, email: user.email ?? null, name: displayName }, { onConflict: "id" });

  if (error) {
    throw new Error(`Failed to ensure profile row: ${error.message}`);
  }
}

export async function requireAuth() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  await ensureProfileRow(supabase, user);
  return { supabase, user };
}

export async function requireRole(allowed: UserRole[]) {
  const { supabase, user } = await requireAuth();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role ?? "member") as UserRole;
  if (!allowed.includes(role)) {
    redirect("/");
  }

  return { supabase, user, role };
}

export async function getCurrentSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  await ensureProfileRow(supabase, user);
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, name, email")
    .eq("id", user.id)
    .single();

  return { user, profile };
}
