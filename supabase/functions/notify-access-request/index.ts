import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { full_name, email, company_name, phone } = await req.json();

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const emailHtml = `
      <h2>🔔 Nova Solicitação de Acesso - NexDisplay</h2>
      <table style="border-collapse:collapse;width:100%;max-width:500px;">
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Nome:</td><td style="padding:8px;border-bottom:1px solid #eee;">${full_name || 'Não informado'}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Email:</td><td style="padding:8px;border-bottom:1px solid #eee;">${email}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Empresa:</td><td style="padding:8px;border-bottom:1px solid #eee;">${company_name || 'Não informada'}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Telefone:</td><td style="padding:8px;">${phone || 'Não informado'}</td></tr>
      </table>
      <p style="margin-top:20px;color:#666;">Acesse o painel administrativo para aprovar ou rejeitar esta solicitação.</p>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NexDisplay <onboarding@resend.dev>',
        to: ['smartsolucoesstore@gmail.com'],
        subject: `Nova solicitação de acesso - ${company_name || email}`,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();
    console.log("Resend response:", resendResponse.status, JSON.stringify(resendData));

    if (!resendResponse.ok) {
      throw new Error(`Resend error [${resendResponse.status}]: ${JSON.stringify(resendData)}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email sent", id: resendData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Notify error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
