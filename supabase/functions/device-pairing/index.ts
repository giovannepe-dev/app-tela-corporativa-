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
    const { action, device_id, pairing_code, device_token, screen_id, playlist_id } = body;

    // === TV registers itself ===
    if (action === "register") {
      if (device_id) {
        const { data, error } = await supabase
          .from("devices")
          .update({
            pairing_code,
            pairing_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            status: "pairing",
            last_seen: new Date().toISOString(),
          })
          .eq("id", device_id)
          .select("id, device_token")
          .single();
        if (error) return json({ error: error.message }, 400);
        return json(data);
      }

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
        .select("id, device_token")
        .single();
      if (error) return json({ error: error.message }, 400);
      return json(data);
    }

    // === Heartbeat ===
    if (action === "heartbeat" || action === "device_heartbeat") {
      if (!device_id) return json({ error: "device_id required" }, 400);
      await supabase
        .from("devices")
        .update({ last_seen: new Date().toISOString(), status: "online" })
        .eq("id", device_id);
      return json({ ok: true });
    }

    // === Admin pairs device by code ===
    if (action === "pair") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", claimsData.claims.sub)
        .single();
      if (!profile?.company_id) return json({ error: "User has no company" }, 400);

      const { data: device, error: deviceError } = await supabase
        .from("devices")
        .select("*")
        .eq("pairing_code", pairing_code)
        .eq("status", "pairing")
        .gt("pairing_expires_at", new Date().toISOString())
        .single();
      if (deviceError || !device) return json({ error: "Código inválido ou expirado" }, 404);

      const { data: updated, error: updateError } = await supabase
        .from("devices")
        .update({
          company_id: profile.company_id,
          status: "online",
          pairing_code: null,
          pairing_expires_at: null,
        })
        .eq("id", device.id)
        .select("id, device_token, name")
        .single();
      if (updateError) return json({ error: updateError.message }, 400);
      return json(updated);
    }

    // === Player: get device by token ===
    if (action === "get_device") {
      if (!device_token) return json({ error: "device_token required" }, 400);
      const { data: dev, error: devErr } = await supabase
        .from("devices")
        .select("*")
        .eq("device_token", device_token)
        .single();
      if (devErr || !dev) return json({ error: "Dispositivo não encontrado" }, 404);
      return json(dev);
    }

    // === Player: get screen data ===
    if (action === "get_screen") {
      if (!screen_id) return json({ error: "screen_id required" }, 400);
      const { data: scr } = await supabase
        .from("screens")
        .select("*")
        .eq("id", screen_id)
        .single();
      return json(scr);
    }

    // === Player: get playlist items ===
    if (action === "get_playlist_items") {
      if (!playlist_id) return json({ error: "playlist_id required" }, 400);
      const { data: items } = await supabase
        .from("playlist_items")
        .select("*, screens(*)")
        .eq("playlist_id", playlist_id)
        .order("sort_order");
      return json(items || []);
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
