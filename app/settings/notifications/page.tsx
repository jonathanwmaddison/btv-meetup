import { requireAuth } from "@/lib/auth";
import { NotificationPrefsForm } from "@/components/notification-prefs-form";

export default async function NotificationSettingsPage() {
  const { supabase, user } = await requireAuth();

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <NotificationPrefsForm
      initial={{
        email_new_events: prefs?.email_new_events ?? true,
        email_rsvp_updates: prefs?.email_rsvp_updates ?? true,
        email_weekly_digest: prefs?.email_weekly_digest ?? false,
        email_cfp_updates: prefs?.email_cfp_updates ?? true
      }}
    />
  );
}
