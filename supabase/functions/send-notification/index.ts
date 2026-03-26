import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  userId?: string;
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, any>;
  broadcastToAll?: boolean; // Send to all users
}

// Import web-push from CDN
const webpush = await import('https://esm.sh/web-push@3.6.0');

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: corsHeaders }
      );
    }

    // Get auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await req.json() as NotificationPayload;

    if (!body.title || !body.body) {
      return new Response(
        JSON.stringify({ error: 'Missing title or body' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Setup web-push
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || '';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';
    const vapidEmail = Deno.env.get('VAPID_EMAIL') || 'mailto:noreply@nexdisplay.com';

    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

    const payload = JSON.stringify({
      title: body.title,
      body: body.body,
      tag: body.tag || 'nexdisplay-notification',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      data: body.data || {},
    });

    let targetUsers = [];

    if (body.broadcastToAll) {
      // Send to all users with subscriptions
      const { data: allSubscriptions, error: fetchError } = await supabase
        .from('push_subscriptions')
        .select('*');

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch subscriptions' }),
          { status: 500, headers: corsHeaders }
        );
      }

      targetUsers = allSubscriptions || [];
    } else {
      // Send to specific user
      const userId = body.userId || user.id;

      const { data: subscriptions, error: fetchError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch subscriptions' }),
          { status: 500, headers: corsHeaders }
        );
      }

      targetUsers = subscriptions || [];
    }

    if (targetUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No subscribed users' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send notifications
    const results = await Promise.allSettled(
      targetUsers.map(sub =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        )
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Clean up failed subscriptions
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'rejected') {
        const reason = (results[i] as PromiseRejectedResult).reason;
        if (reason?.statusCode === 410) {
          // Subscription expired
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', targetUsers[i].endpoint);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent to ${successful} users`,
        sent: successful,
        failed,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
