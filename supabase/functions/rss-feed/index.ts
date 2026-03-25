const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function extractText(xml: string, tag: string): string {
  const cdataMatch = xml.match(new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`));
  if (cdataMatch) return cdataMatch[1].trim();
  const match = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`, 's'));
  return match ? match[1].replace(/<[^>]*>/g, '').trim() : '';
}

function extractImage(itemXml: string): string {
  // Try media:content
  const media = itemXml.match(/url="([^"]+\.(jpg|jpeg|png|webp|gif)[^"]*)"/i);
  if (media) return media[1];
  // Try enclosure
  const enc = itemXml.match(/<enclosure[^>]+url="([^"]+)"/);
  if (enc) return enc[1];
  // Try img in description
  const img = itemXml.match(/<img[^>]+src="([^"]+)"/);
  if (img) return img[1];
  return '';
}

function parseRSS(xml: string, limit: number) {
  const items: any[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
    const itemXml = match[1];
    items.push({
      title: extractText(itemXml, 'title'),
      description: extractText(itemXml, 'description').substring(0, 200),
      link: extractText(itemXml, 'link'),
      pubDate: extractText(itemXml, 'pubDate'),
      image: extractImage(itemXml),
    });
  }

  const feedTitle = extractText(xml, 'title');
  return { title: feedTitle, items };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, limit = 10 } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'Feed URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching RSS:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*;q=0.1',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': new URL(url).origin + '/',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      console.log('RSS feed returned status:', response.status);
      return new Response(
        JSON.stringify({ error: `Feed indisponível (status ${response.status}). Tente outra URL de feed.` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode with encoding detection
    const rawBytes = new Uint8Array(await response.arrayBuffer());
    let xml: string;
    
    try {
      // Try UTF-8 with fatal mode - throws if bytes are invalid UTF-8
      xml = new TextDecoder('utf-8', { fatal: true }).decode(rawBytes);
      console.log('RSS: decoded as UTF-8');
    } catch {
      // Not valid UTF-8 - decode as Latin1 (byte-to-codepoint mapping)
      console.log('RSS: UTF-8 failed, using Latin1 mapping, bytes:', rawBytes.length);
      const parts: string[] = [];
      for (let i = 0; i < rawBytes.length; i++) {
        parts.push(String.fromCharCode(rawBytes[i]));
      }
      xml = parts.join('');
    }
    
    const feed = parseRSS(xml, limit);

    return new Response(
      JSON.stringify({ success: true, ...feed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('RSS error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch feed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
