import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateClientId, generateClientSecret, hashClientSecret } from "@/lib/oauth";

type RegisterBody = {
  client_name?: string;
  redirect_uris?: string[];
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RegisterBody;

  if (!body.client_name || !body.redirect_uris?.length) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "client_name and redirect_uris[] are required" },
      { status: 400 }
    );
  }

  const clientId = generateClientId();
  const clientSecret = generateClientSecret();
  const secretHash = hashClientSecret(clientSecret);

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("oauth_clients").insert({
    client_id: clientId,
    client_secret_hash: secretHash,
    client_name: body.client_name,
    redirect_uris: body.redirect_uris
  });

  if (error) {
    return NextResponse.json({ error: "server_error", error_description: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      client_id: clientId,
      client_secret: clientSecret,
      client_name: body.client_name,
      redirect_uris: body.redirect_uris
    },
    { status: 201 }
  );
}
