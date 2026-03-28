import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { pairing_code } = body;

    if (!pairing_code) {
      return json({ error: "pairing_code required" }, 400);
    }

    // Register TV device with pairing code
    const { data, error } = await supabase
      .from("devices")
      .insert({
        name: `TV-${pairing_code}`,
        company_id: "00000000-0000-0000-0000-000000000000",
        pairing_code,
        pairing_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        status: "pairing",
        last_seen: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      return json({ error: error.message }, 400);
    }

    return json(data);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});
