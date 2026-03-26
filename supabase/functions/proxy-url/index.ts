// Session cookie cache keyed by hostname — persists within an Edge Function instance
// so the expensive "double-fetch" to initialize a PHP/session only happens once.
const sessionCookieStore = new Map<string, string>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function getProxyBaseUrl(req: Request): string {
  const url = new URL(req.url);
  let pathname = url.pathname;
  if (!pathname.includes('/functions/v1/')) {
    pathname = '/functions/v1/proxy-url';
  }
  return `https://${url.host}${pathname.split('/functions/v1/proxy-url')[0]}/functions/v1/proxy-url`;
}

function getTargetUrlFromPath(pathname: string): string | null {
  const marker = '/functions/v1/proxy-url/';
  const idx = pathname.indexOf(marker);
  if (idx === -1) return null;

  const encoded = pathname.slice(idx + marker.length);
  if (!encoded) return null;

  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

function rewriteUrls(html: string, targetOrigin: string, proxyBase: string, proxyExtraQuery = ''): string {
  // Rewrite absolute paths like src="/static/..." but not protocol-relative "//..."
  html = html.replace(
    /(src|href|action)=(["'])\/(?!\/)(.*?)\2/g,
    (_match, attr, quote, path) => {
      const fullUrl = targetOrigin + '/' + path;
      return `${attr}=${quote}${proxyBase}?url=${encodeURIComponent(fullUrl)}${proxyExtraQuery}${quote}`;
    }
  );

  // Rewrite protocol-relative URLs like //cdn.example.com/...
  html = html.replace(
    /(src|href|action)=(["'])\/\/(.*?)\2/g,
    (_match, attr, quote, rest) => {
      const targetProtocol = new URL(targetOrigin).protocol;
      const fullUrl = `${targetProtocol}//${rest}`;
      return `${attr}=${quote}${proxyBase}?url=${encodeURIComponent(fullUrl)}${proxyExtraQuery}${quote}`;
    }
  );

  // Rewrite absolute http/https URLs (avoid double-proxy)
  html = html.replace(
    /(src|href|action)=(["'])(https?:\/\/.*?)\2/g,
    (_match, attr, quote, fullUrl) => {
      if (typeof fullUrl === 'string' && fullUrl.startsWith(proxyBase)) {
        return `${attr}=${quote}${fullUrl}${quote}`;
      }
      return `${attr}=${quote}${proxyBase}?url=${encodeURIComponent(fullUrl)}${proxyExtraQuery}${quote}`;
    }
  );

  return html;
}

// Extract cookies from fetch response headers
function extractSetCookies(response: Response): string[] {
  const cookies: string[] = [];
  // Deno's response.headers.getSetCookie() if available
  if (typeof response.headers.getSetCookie === 'function') {
    cookies.push(...response.headers.getSetCookie());
  } else {
    // Fallback: iterate headers
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        cookies.push(value);
      }
    });
  }
  return cookies;
}

// Rewrite Set-Cookie to work on proxy domain and cross-site iframe context
function rewriteCookies(cookies: string[]): string[] {
  return cookies.map((cookie) => {
    let rewritten = cookie;

    // Ensure cookie applies on proxy host/path
    rewritten = rewritten.replace(/;\s*Domain=[^;]*/gi, '');
    rewritten = rewritten.replace(/;\s*Path=[^;]*/gi, '; Path=/');

    // In iframe cross-site context, SameSite must be None + Secure
    rewritten = rewritten.replace(/;\s*SameSite=[^;]*/gi, '');
    if (!/;\s*Secure/gi.test(rewritten)) {
      rewritten += '; Secure';
    }
    rewritten += '; SameSite=None';

    return rewritten;
  });
}

function patchNavigationCallsInJs(jsText: string): string {
  let patched = jsText;

  patched = patched.replace(
    /\b(?:window\.)?location\.reload\([^)]*\)/g,
    'window.__proxyBlockReload && window.__proxyBlockReload()'
  );

  patched = patched.replace(
    /\b(?:window\.)?location\.(?:assign|replace)\(([^)]*)\)/g,
    'window.__proxySetHref && window.__proxySetHref($1)'
  );

  // Replace direct href reads/writes to avoid full document navigations
  patched = patched.replace(/\bwindow\.location\.href\b/g, 'window.__proxyHref');
  patched = patched.replace(/\blocation\.href\b/g, 'window.__proxyHref');

  return patched;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let targetUrl: string | null = null;
    const reqUrl = new URL(req.url);
    const queryUrl = reqUrl.searchParams.get('url');
    const pathUrl = getTargetUrlFromPath(reqUrl.pathname);

    let requestBody: Record<string, unknown> | null = null;
    if (!queryUrl && !pathUrl && req.method === 'POST') {
      try {
        requestBody = await req.json();
      } catch {
        requestBody = null;
      }
    }

    const rawMode =
      reqUrl.searchParams.get('raw') === '1' ||
      requestBody?.raw === true ||
      requestBody?.raw === '1';

    const bodyApiKey = typeof requestBody?.apikey === 'string' ? requestBody.apikey : null;
    const apikey = reqUrl.searchParams.get('apikey') || req.headers.get('apikey') || bodyApiKey;

    const explicitCtxSearch = reqUrl.searchParams.get('ctx_search') || '';
    let contextSearch = explicitCtxSearch;

    if (queryUrl) {
      targetUrl = queryUrl;
    } else if (pathUrl) {
      targetUrl = pathUrl;
    } else if (typeof requestBody?.url === 'string') {
      targetUrl = requestBody.url;
    }

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!contextSearch) {
      try {
        contextSearch = new URL(targetUrl).search || '';
      } catch {
        contextSearch = '';
      }
    }

    const proxyExtraQuery = `${rawMode ? '&raw=1' : ''}${apikey ? `&apikey=${encodeURIComponent(apikey)}` : ''}${contextSearch ? `&ctx_search=${encodeURIComponent(contextSearch)}` : ''}`;

    console.log('Proxying URL:', targetUrl);

    const parsedTargetUrl = new URL(targetUrl);
    const urlPath = parsedTargetUrl.pathname;
    const targetSearch = parsedTargetUrl.search.toLowerCase();
    const isSubResource = /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico|json|map)$/i.test(urlPath);
    const isSocketIoPath = /\/socket\.io(?:\/|$)/i.test(urlPath);
    const isVersionPath = /\/versao$/i.test(urlPath);
    const isRealtimePolling = isSocketIoPath || (targetSearch.includes('transport=polling') && targetSearch.includes('eio='));
    const prefersNonHtml = isSubResource || isRealtimePolling || isVersionPath;
    // Forward cookies from client request to target
    const clientCookies = req.headers.get('cookie') || '';
    const targetDomain = parsedTargetUrl.hostname;

    // ext_cookie: manually supplied session cookie from widget settings (query param or POST body)
    const extCookie = reqUrl.searchParams.get('ext_cookie') || (typeof requestBody?.ext_cookie === 'string' ? requestBody.ext_cookie : '') || '';

    // Include any previously cached session cookies for this domain
    const cachedSessionCookies = sessionCookieStore.get(targetDomain) || '';
    const combinedClientCookies = [clientCookies, cachedSessionCookies, extCookie].filter(Boolean).join('; ');

    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': prefersNonHtml ? '*/*' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'identity',
    };

    // Forward client cookies + cached session cookies to the target site
    if (combinedClientCookies) {
      fetchHeaders['Cookie'] = combinedClientCookies;
    }

    // For non-HTML endpoints (Socket.IO polling, APIs), forward method and body
    // so POST heartbeats and data-sends reach the target correctly.
    const fetchInit: RequestInit = { headers: fetchHeaders, redirect: 'follow' };
    if (prefersNonHtml && req.method !== 'GET' && req.method !== 'HEAD') {
      fetchInit.method = req.method;
      try {
        const bodyBytes = await req.arrayBuffer();
        if (bodyBytes.byteLength > 0) {
          fetchInit.body = bodyBytes;
          const clientCT = req.headers.get('content-type');
          if (clientCT) fetchHeaders['Content-Type'] = clientCT;
        }
      } catch (_) {}
    }

    let response = await fetch(targetUrl, fetchInit);

    // Cache session cookies set by the server (e.g. PHP PHPSESSID).
    // If we had no cached session yet and the server set one, do a second
    // request so the server sees an initialised session and returns full HTML.
    if (!prefersNonHtml) {
      const newSetCookies = extractSetCookies(response);
      if (newSetCookies.length > 0) {
        const newCookieStr = newSetCookies
          .map(c => c.split(';')[0].trim())
          .filter(c => c.includes('='))
          .join('; ');
        if (newCookieStr) {
          sessionCookieStore.set(targetDomain, newCookieStr);
          // Only pay the double-fetch cost when there were no cached cookies yet
          if (!cachedSessionCookies) {
            fetchHeaders['Cookie'] = [combinedClientCookies, newCookieStr].filter(Boolean).join('; ');
            try {
              const sessionResponse = await fetch(targetUrl, { headers: fetchHeaders, redirect: 'follow' });
              if (sessionResponse.ok) {
                response = sessionResponse;
              }
            } catch (_) {}
          }
        }
      }
    }

    // Extract Set-Cookie headers from final response (for forwarding to client)
    const setCookies = extractSetCookies(response);
    const rewrittenCookies = rewriteCookies(setCookies);

    if (!response.ok) {
      if (queryUrl) {
        return new Response(`<html><body><p>Error: status ${response.status}</p></body></html>`, {
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      return new Response(
        JSON.stringify({ error: `Site returned status ${response.status}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const isPlainText = /^text\/plain\b/.test(contentType);
    const isLikelyAssetByPath = isSubResource || isRealtimePolling || isVersionPath;
    const treatPlainTextAsNonHtml = isPlainText && isLikelyAssetByPath;
    const isNonHtmlContent =
      prefersNonHtml ||
      /^(image|audio|video|font)\//.test(contentType) ||
      /(javascript|ecmascript|json|css|octet-stream|pdf|zip|woff|woff2|ttf|eot|ico)/.test(contentType) ||
      treatPlainTextAsNonHtml;

    // For binary/assets and API payloads, pass through as-is with cookies
    if (isNonHtmlContent) {
      const passthroughType = contentType || 'application/octet-stream';
      const isJavaScript = /javascript|ecmascript/.test(contentType) || /\.js$/i.test(urlPath);
      const passthroughNoStore = isRealtimePolling || isVersionPath || treatPlainTextAsNonHtml || isJavaScript;
      const headers = new Headers({
        ...corsHeaders,
        'Content-Type': passthroughType,
        'Cache-Control': passthroughNoStore ? 'no-store' : 'public, max-age=3600',
      });
      // Forward Set-Cookie headers
      rewrittenCookies.forEach(c => headers.append('Set-Cookie', c));

      if (isJavaScript) {
        // Pass through JS as-is to avoid breaking third-party realtime libraries (e.g. socket.io)
        const jsText = await response.text();
        return new Response(jsText, { headers });
      }

      const body = await response.arrayBuffer();
      return new Response(body, { headers });
    }

    // For HTML pages, rewrite URLs
    let html = await response.text();
    console.log('HTML_DIAG url=' + targetUrl + ' len=' + html.length + ' hasCHAMADOS=' + html.includes('CHAMADOS') + ' hasSENHA=' + html.includes('SENHA'));
    const targetOrigin = new URL(targetUrl).origin;
    const proxyBase = getProxyBaseUrl(req);

    // Remove existing base tags
    html = html.replace(/<base[^>]*>/gi, '');

    // In raw mode we avoid JS patching/injection to prevent source-code overlays on some legacy pages
    if (!rawMode) {
      html = patchNavigationCallsInJs(html);

      // Rewrite webpack/vite publicPath
      html = html.replace(
        /\.p\s*=\s*["']\/["']/g,
        `.p="${proxyBase}?url=${encodeURIComponent(targetOrigin + '/')}${proxyExtraQuery}"`
      );
    }

    // Rewrite resource URLs
    html = rewriteUrls(html, targetOrigin, proxyBase, proxyExtraQuery);

    // Ensure <head> exists for proper injection of base/script tags
    const hasHead = /<head[^>]*>/i.test(html);
    if (!hasHead) {
      // Insert <head></head> after <html...> or at the very beginning
      const htmlTagMatch = html.match(/(<html[^>]*>)/i);
      if (htmlTagMatch) {
        html = html.replace(htmlTagMatch[0], `${htmlTagMatch[0]}<head></head>`);
      } else {
        html = `<head></head>${html}`;
      }
    }

    // Re-add base tag AFTER rewrite to avoid accidentally proxifying <base href>
    html = html.replace(
      /(<head[^>]*>)/i,
      `$1<base href="${targetOrigin}/">`
    );

    // Inject a script that intercepts network calls for SPA/runtime compatibility
    const parsedTarget = new URL(targetUrl);
    const targetPath = parsedTarget.pathname + parsedTarget.search + parsedTarget.hash;
    const targetProtocol = parsedTarget.protocol;

    const interceptScript = `
    <script>
    (function() {
      var proxyBase = "${proxyBase}";
      var proxyOrigin = new URL(proxyBase).origin;
      var proxyExtraQuery = "${proxyExtraQuery}";
      var targetOrigin = "${targetOrigin}";
      var targetPath = "${targetPath.replace(/"/g, '\\"')}";
      var targetAbsolute = targetOrigin + targetPath;
      var targetProtocol = "${targetProtocol}";
      window.__proxyBlockReload = function() { return undefined; };
      var __proxyHrefValue = targetAbsolute;

      function toAbsoluteUrl(rawUrl) {
        if (typeof rawUrl !== 'string') return rawUrl;
        var url = rawUrl.trim();
        if (!url) return url;

        if (url.startsWith('javascript:') || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('#')) {
          return url;
        }

        if (url.startsWith(proxyBase)) return url;

        if (url.startsWith('/')) {
          return targetOrigin + url;
        }

        if (url.startsWith('//')) {
          return targetProtocol + url;
        }

        if (url.startsWith('about:')) {
          var aboutPath = url.slice('about:'.length);
          if (!aboutPath || aboutPath === 'blank') {
            return targetOrigin + '/';
          }
          while (aboutPath.startsWith('/')) {
            aboutPath = aboutPath.slice(1);
          }
          return targetOrigin + '/' + aboutPath;
        }

        if (url.startsWith('http://') || url.startsWith('https://')) {
          try {
            var parsed = new URL(url);
            if (parsed.hostname === 'about') {
              return targetOrigin + parsed.pathname + parsed.search + parsed.hash;
            }

            // If SPA builds absolute URLs from current proxy host, map back to target host
            if (parsed.origin === proxyOrigin) {
              if (parsed.pathname.startsWith('/functions/v1/proxy-url')) {
                var proxiedTarget = parsed.searchParams.get('url');
                if (proxiedTarget) return proxiedTarget;
              }
              return targetOrigin + parsed.pathname + parsed.search + parsed.hash;
            }
          } catch (_) {}
          return url;
        }

        try {
          return new URL(url, targetAbsolute).toString();
        } catch (_) {
          return url;
        }
      }

      function proxifyUrl(rawUrl) {
        var absolute = toAbsoluteUrl(rawUrl);
        if (typeof absolute !== 'string') return absolute;

        if (!absolute || absolute.startsWith(proxyBase)) return absolute;
        if (absolute.startsWith('javascript:') || absolute.startsWith('data:') || absolute.startsWith('blob:') || absolute.startsWith('#')) {
          return absolute;
        }

        if (absolute.startsWith('http://') || absolute.startsWith('https://')) {
          return proxyBase + '?url=' + encodeURIComponent(absolute) + proxyExtraQuery;
        }

        return absolute;
      }

      window.__proxySetHref = function(nextUrl) {
        try {
          var absolute = toAbsoluteUrl(String(nextUrl || __proxyHrefValue));
          if (typeof absolute === 'string' && absolute) {
            __proxyHrefValue = absolute;
            var parsedNext = new URL(absolute, targetAbsolute);
            var nextPath = parsedNext.pathname + parsedNext.search + parsedNext.hash;
            history.replaceState(null, '', nextPath || targetPath);
          }
        } catch (_) {}
        return undefined;
      };

      try {
        Object.defineProperty(window, '__proxyHref', {
          configurable: true,
          enumerable: false,
          get: function() { return __proxyHrefValue; },
          set: function(nextUrl) { window.__proxySetHref(nextUrl); },
        });
      } catch (_) {}

      // Override window.location properties so Socket.IO and other scripts
      // that use window.location.host to determine their server URL connect
      // to the correct target server, not the srcdoc iframe's parent host.
      try {
        var _parsedTarget = new URL(targetOrigin);
        var _targetHost = _parsedTarget.host;
        var _targetHostname = _parsedTarget.hostname;
        var _targetPort = _parsedTarget.port;
        var _targetProtocol = _parsedTarget.protocol;
        var _targetPathOnly = targetPath.split('?')[0].split('#')[0];
        var _targetSearch = targetPath.includes('?') ? '?' + targetPath.split('?').slice(1).join('?').split('#')[0] : '';
        var _targetHash = targetPath.includes('#') ? '#' + targetPath.split('#').slice(1).join('#') : '';

        var locationProto = Object.getPrototypeOf(window.location);
        var _locOverrides = {
          host: function() { return _targetHost; },
          hostname: function() { return _targetHostname; },
          port: function() { return _targetPort; },
          protocol: function() { return _targetProtocol; },
          origin: function() { return targetOrigin; },
          pathname: function() { return _targetPathOnly; },
          search: function() { return _targetSearch; },
          hash: function() { return _targetHash; },
          href: function() { return __proxyHrefValue; },
        };
        Object.keys(_locOverrides).forEach(function(prop) {
          var desc = Object.getOwnPropertyDescriptor(locationProto, prop);
          if (desc && desc.configurable) {
            Object.defineProperty(locationProto, prop, {
              configurable: true,
              enumerable: desc.enumerable === true,
              get: _locOverrides[prop],
              set: prop === 'href' ? function(v) { window.__proxySetHref(v); } : undefined,
            });
          }
        });
      } catch (_) {}

      // WebSocket connections are left untouched: browsers already block ws:// (HTTP)
      // connections from HTTPS pages as mixed content, so polling fallback happens
      // automatically. The XHR interceptor above handles all polling requests.

      try { history.replaceState(null, '', targetPath); } catch(_) {}
      try { window.__proxyHref = targetAbsolute; } catch(_) {}

      try { window.location.reload = window.__proxyBlockReload; } catch (_) {}
      try { window.location.assign = window.__proxySetHref; } catch (_) {}
      try { window.location.replace = window.__proxySetHref; } catch (_) {}

      // Proxify dynamic script injections (covers JSONP/socket-like fallbacks)
      try {
        var scriptProto = HTMLScriptElement && HTMLScriptElement.prototype;
        if (scriptProto) {
          var srcDescriptor = Object.getOwnPropertyDescriptor(scriptProto, 'src');
          if (srcDescriptor && srcDescriptor.configurable && srcDescriptor.set && srcDescriptor.get) {
            Object.defineProperty(scriptProto, 'src', {
              configurable: true,
              enumerable: srcDescriptor.enumerable === true,
              get: function() {
                return srcDescriptor.get.call(this);
              },
              set: function(nextUrl) {
                var proxied = typeof nextUrl === 'string' ? proxifyUrl(nextUrl) : nextUrl;
                srcDescriptor.set.call(this, proxied);
              },
            });
          }
        }
      } catch (_) {}

      try {
        var originalSetAttribute = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function(name, value) {
          if (typeof name === 'string' && typeof value === 'string') {
            var attr = name.toLowerCase();
            if (attr === 'src' || attr === 'href' || attr === 'action') {
              value = proxifyUrl(value);
            }
          }
          return originalSetAttribute.call(this, name, value);
        };
      } catch (_) {}

      var origFetch = window.fetch;
      window.fetch = function(input, opts) {
        if (typeof input === 'string') {
          return origFetch.call(this, proxifyUrl(input), opts);
        }

        if (input && typeof input.url === 'string') {
          var nextUrl = proxifyUrl(input.url);
          if (nextUrl !== input.url) {
            input = new Request(nextUrl, input);
          }
        }

        return origFetch.call(this, input, opts);
      };

      var origOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url) {
        var args = Array.prototype.slice.call(arguments);
        if (typeof args[1] === 'string') {
          args[1] = proxifyUrl(args[1]);
        }
        return origOpen.apply(this, args);
      };
    })();
    </script>`;

    // Inject interceptor right after <head> (disabled in raw mode)
    if (!rawMode) {
      html = html.replace(/(<head[^>]*>)/i, `$1${interceptScript}`);

      // Fix: Bootstrap's w-50 + mx-5 columns overflow the viewport when the
      // page's own CSS override uses an ancestor selector that doesn't match
      // the actual DOM nesting (common in sidebar admin templates).
      // Target the columns directly by their own class combination so the fix
      // applies regardless of nesting depth. Also ensure hidden content is visible.
      const layoutFix = `<style id="_px_lf">` +
        `.d-flex.flex-column.w-50.h-100{` +
          `width:48vw!important;min-width:0!important;max-width:48vw!important;` +
          `margin:0 1vw!important;height:96vh!important;flex-shrink:0!important;` +
          `box-sizing:border-box!important;overflow:auto!important;` +
          `visibility:visible!important;display:flex!important;}` +
        `.w-50{width:48vw!important;max-width:48vw!important;}` +
        `[class*="CHAMADOS"]{visibility:visible!important;display:block!important;background:#222!important;border:2px solid #00ff00!important;}` +
        `.card{visibility:visible!important;background:#1a1a1a!important;border:1px solid #666!important;}` +
        `</style>`;
      html = html.replace(/(<\/head>)/i, `${layoutFix}$1`);
    }

    if (queryUrl) {
      const headers = new Headers({
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      // Forward Set-Cookie headers to client
      rewrittenCookies.forEach(c => headers.append('Set-Cookie', c));
      return new Response(html, { headers });
    }

    // POST mode: return JSON (cookies can't be set via JSON response easily)
    return new Response(
      JSON.stringify({ html }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Proxy error:', error);
    const errMsg = error instanceof Error ? error.message : 'Failed to fetch URL';
    const reqUrl = new URL(req.url);
    if (reqUrl.searchParams.get('url')) {
      return new Response(`<html><body><p>Proxy error: ${errMsg}</p></body></html>`, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
