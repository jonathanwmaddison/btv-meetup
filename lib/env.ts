type EnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "NEXT_PUBLIC_APP_URL";

export function getEnv(name: EnvKey): string {
  const value =
    name === "NEXT_PUBLIC_SUPABASE_URL"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : name === "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        : name === "SUPABASE_SERVICE_ROLE_KEY"
          ? process.env.SUPABASE_SERVICE_ROLE_KEY
          : process.env.NEXT_PUBLIC_APP_URL;

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}
