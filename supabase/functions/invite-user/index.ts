import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is authenticated and has admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
    } = await supabaseUser.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get caller's company
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("user_id", caller.id)
      .single();

    if (!callerProfile?.company_id) {
      return new Response(
        JSON.stringify({ error: "Usuário sem empresa vinculada" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check caller has admin role
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("company_id", callerProfile.company_id);

    const hasAdmin = callerRoles?.some(
      (r) =>
        r.role === "admin_empresa" || r.role === "super_admin"
    );

    if (!hasAdmin) {
      return new Response(
        JSON.stringify({ error: "Sem permissão para convidar usuários" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { email, role, full_name } = await req.json();

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: "Email e papel são obrigatórios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const companyId = callerProfile.company_id;

    // Check if user already exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("user_id, company_id")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (existingProfile) {
      if (existingProfile.company_id === companyId) {
        return new Response(
          JSON.stringify({ error: "Usuário já pertence a esta empresa" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Link existing user to company
      await supabaseAdmin
        .from("profiles")
        .update({ company_id: companyId })
        .eq("user_id", existingProfile.user_id);

      // Remove old roles for this company if any
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", existingProfile.user_id)
        .eq("company_id", companyId);

      // Assign new role
      await supabaseAdmin.from("user_roles").insert({
        user_id: existingProfile.user_id,
        company_id: companyId,
        role,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Usuário existente adicionado à empresa",
          existed: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // User doesn't exist — create via admin API
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        email_confirm: true,
        user_metadata: {
          full_name: full_name || "",
          invited_by: caller.id,
          company_id: companyId,
        },
      });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Wait for trigger to create profile, then update company_id
    // The handle_new_user trigger creates the profile
    await new Promise((r) => setTimeout(r, 1000));

    await supabaseAdmin
      .from("profiles")
      .update({ company_id: companyId, full_name: full_name || "" })
      .eq("user_id", newUser.user!.id);

    // Assign role
    await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user!.id,
      company_id: companyId,
      role,
    });

    // Generate password reset link so invited user can set password
    const { data: resetData } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: email.trim().toLowerCase(),
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Usuário criado e adicionado à empresa",
        existed: false,
        magic_link: resetData?.properties?.action_link || null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
