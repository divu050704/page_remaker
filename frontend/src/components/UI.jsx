import { useState, useMemo, useRef, useEffect, useCallback } from "react";
export function PreviewView({ html, oldHtml, sourceUrl }) {
  const [viewMode, setViewMode] = useState("after"); // 'before', 'after', 'split'
  const [isFullscreen, setIsFullscreen] = useState(false);

  const safeFinalHtml = useMemo(() => wrapHtml(sanitizeHtml(html), sourceUrl), [html, sourceUrl]);
  const safeOldHtml = useMemo(() => wrapHtml(sanitizeHtml(oldHtml), sourceUrl), [oldHtml, sourceUrl]);

  if (!html && !oldHtml) return <Empty text="No preview yet. Run the pipeline first." />;

  const containerClass = isFullscreen 
    ? "fixed inset-0 z-50 bg-[#f8f7f4] p-6 flex flex-col" 
    : "flex flex-col h-full space-y-4";

  return (
    <div className={containerClass}>
      
      {/* Controls Header */}
      <div className="flex items-center justify-between bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm shrink-0">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          {["before", "after", "split"].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${
                viewMode === mode ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {mode === "split" ? "Side-by-side" : mode}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
        >
          {isFullscreen ? (
             <>
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
               Exit Fullscreen
             </>
          ) : (
             <>
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
               Fullscreen
             </>
          )}
        </button>
      </div>

      {/* iFrames Container */}
      <div className={`flex-1 flex gap-4 min-h-[500px] ${viewMode === 'split' ? 'flex-col lg:flex-row' : ''}`}>
        
        {(viewMode === "before" || viewMode === "split") && (
           <div className="flex-1 flex flex-col border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm relative">
              {viewMode === "split" && <div className="absolute top-0 left-0 bg-gray-900 text-white text-[10px] font-bold px-3 py-1 rounded-br-lg z-10 uppercase tracking-wider">Original Page</div>}
              <iframe
                className="w-full h-full"
                srcDoc={safeOldHtml}
                sandbox="allow-scripts allow-same-origin allow-forms"
                title="Original page preview"
              />
           </div>
        )}

        {(viewMode === "after" || viewMode === "split") && (
           <div className="flex-1 flex flex-col border border-emerald-200 rounded-xl bg-white overflow-hidden shadow-sm relative">
              {viewMode === "split" && <div className="absolute top-0 left-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-br-lg z-10 uppercase tracking-wider">Personalized Page</div>}
              <iframe
                className="w-full h-full"
                srcDoc={safeFinalHtml}
                sandbox="allow-scripts allow-same-origin allow-forms"
                title="Modified page preview"
              />
           </div>
        )}

      </div>
    </div>
  );
}

export function Card({ title, children, accent }) {
  const accents = {
    red:    "border-l-red-400",
    amber:  "border-l-amber-400",
    green:  "border-l-emerald-400",
    blue:   "border-l-blue-400",
    gray:   "border-l-gray-300",
  };
  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${accents[accent] || accents.gray} p-5`}>
      {title && (
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em] mb-3.5">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

export function Empty({ text }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-gray-400">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
        <svg className="w-5 h-5 opacity-40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      </div>
      <p className="text-sm text-center max-w-xs leading-relaxed">{text}</p>
    </div>
  );
}
// ─── Mocks injected into the preview iframe ──────────────────────────────
const MOCK_SCRIPTS = `
<script>
  window.fetch = () =>
    Promise.resolve({
      ok: true, status: 200,
      json: async () => ({}),
      text: async () => "",
      clone() { return this; },
    });

  window.XMLHttpRequest = function () {
    return {
      open() {}, send() {
        this.readyState = 4; this.status = 200; this.responseText = "";
        if (this.onload) this.onload();
        if (this.onreadystatechange) this.onreadystatechange();
      },
      setRequestHeader() {}, addEventListener() {}, removeEventListener() {},
    };
  };

  window.WebSocket = function () {
    return { send() {}, close() {}, readyState: 1, addEventListener() {} };
  };

  navigator.sendBeacon = () => true;

  const _noop = () => {};
  window.gtag = _noop;
  window.ga   = _noop;
  window.fbq  = _noop;
  window.hj   = _noop;
  window.analytics = { track: _noop, identify: _noop, page: _noop };

  function reportHeight() {
    const h = document.documentElement.scrollHeight;
    window.parent.postMessage({ type: "iframe-height", height: h }, "*");
  }
  window.addEventListener("load", reportHeight);
  new MutationObserver(reportHeight).observe(document.body, {
    subtree: true, childList: true, attributes: true,
  });
<\/script>`;

function sanitizeHtml(html) {
  if (!html) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const REMOVE_SELECTORS = [
    "script[src*='google-analytics']",
    "script[src*='googletagmanager']",
    "script[src*='facebook']",
    "script[src*='fbevents']",
    "script[src*='hotjar']",
    "script[src*='clarity']",
    "script[src*='segment']",
    "script[src*='intercom']",
    "script[src*='crisp']",
    "script[src*='zendesk']",
    "script[src*='tawk']",
    "link[rel='preconnect']",
    "link[rel='dns-prefetch']",
    "noscript",
  ];
  REMOVE_SELECTORS.forEach((sel) => {
    doc.querySelectorAll(sel).forEach((el) => el.remove());
  });

  const REMOVE_PIXELS = [
    "img[src*='linkedin.com']",
    "img[src*='ads.linkedin.com']",
    "img[src*='facebook.com/tr']",
    "img[src*='google-analytics.com/collect']",
  ];
  REMOVE_PIXELS.forEach((sel) => {
    doc.querySelectorAll(sel).forEach((el) => el.remove());
  });

  doc.querySelectorAll("[onclick],[onsubmit],[onchange]").forEach((el) => {
    ["onclick", "onsubmit", "onchange"].forEach((ev) => {
      if (el.hasAttribute(ev)) el.setAttribute(ev, "void(0)");
    });
  });

  return doc.documentElement.outerHTML;
}

function wrapHtml(html, baseUrl) {
  const isFullPage = /<html[\s>]/i.test(html);

  if (isFullPage) {
    let patched = html;
    const baseTag = baseUrl ? `<base href="${baseUrl}">` : "";
    if (baseTag) {
      patched = patched.replace(/(<head[^>]*>)/i, `$1${baseTag}`);
    }
    patched = patched.replace(/(<head[^>]*>)/i, `$1${MOCK_SCRIPTS}`);
    patched = patched.replace(/(<body[^>]*>)/i, `$1<style>body{margin:0;}</style>`);
    return patched;
  }

  const baseTag = baseUrl ? `<base href="${baseUrl}">` : "";
  return `<!DOCTYPE html>
<html>
  <head>
    ${baseTag}
    ${MOCK_SCRIPTS}
    <style>body { margin: 0; font-family: sans-serif; }</style>
  </head>
  <body>
    ${html}
  </body>
</html>`;
}

export function HtmlView({ html, sourceUrl }) {
  const [copied, setCopied]   = useState(false);
  const [iframeH, setIframeH] = useState(520);
  const iframeRef             = useRef(null);

  const onMessage = useCallback((e) => {
    if (e.data?.type === "iframe-height" && typeof e.data.height === "number") {
      setIframeH(Math.max(200, e.data.height + 32));
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onMessage]);

  useEffect(() => { setIframeH(520); }, [html]);

  const safeHtml = useMemo(
    () => wrapHtml(sanitizeHtml(html), sourceUrl),
    [html, sourceUrl]
  );

  const copy = () => {
    navigator.clipboard.writeText(html).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!html) return <Empty text="No HTML output yet." />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">Modified HTML</span>
        <button
          onClick={copy}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors font-medium"
        >
          {copied ? "✓ Copied!" : "Copy HTML"}
        </button>
      </div>

      <iframe
        ref={iframeRef}
        className="w-full rounded-xl border border-gray-200 bg-white transition-[height] duration-300"
        style={{ height: iframeH }}
        srcDoc={safeHtml}
        sandbox="allow-scripts allow-same-origin allow-forms"
        title="HTML Preview"
      />

      <details className="text-xs">
        <summary className="cursor-pointer text-gray-400 select-none hover:text-gray-600 transition-colors">
          Show raw HTML
        </summary>
        <pre className="mt-2 p-4 bg-gray-50 border border-gray-100 rounded-xl overflow-auto max-h-[300px] whitespace-pre-wrap break-all text-gray-600 leading-relaxed">
          {html}
        </pre>
      </details>
    </div>
  );
}