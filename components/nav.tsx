import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export async function Nav() {
  const session = await getCurrentSession();
  const role = session?.profile?.role;

  return (
    <header className="shell nav">
      <nav className="nav-links">
        <Link href="/" className="brand">
          Burlington & Beyond AI Meetup
        </Link>
        <Link href="/events">Events</Link>
        <Link href="/ideas">Ideas</Link>
        <Link href="/speakers">Speakers</Link>
        <Link href="/venues">Venues</Link>
        <Link href="/cfp">Submit Talk</Link>
        {session && <Link href="/dashboard">Dashboard</Link>}
        {session && <Link href="/settings/notifications">Notifications</Link>}
        {session && <Link href="/settings/integrations">Integrations</Link>}
        {(role === "organizer" || role === "admin") && <Link href="/organizer/events">Organizer</Link>}
        {role === "admin" && <Link href="/admin/users">Admin</Link>}
        {role === "admin" && <a href="/admin/email-jobs">Email Ops</a>}
      </nav>
      <div className="nav-auth">
        {session ? <SignOutButton /> : <Link href="/auth/login">Sign in</Link>}
      </div>
    </header>
  );
}
