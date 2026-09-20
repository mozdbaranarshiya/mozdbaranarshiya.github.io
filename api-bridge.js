/* PersonalSpace API compatibility bridge.
 * API_MODE=local: keep same-origin Flask/Python requests untouched.
 * API_MODE=external: forward /api/* to API_BASE_URL (Serveo -> local Flask).
 * API_MODE=supabase: forward /api/* to the configured Edge Function.
 */
(function () {
  "use strict";

  if (window.PersonalSpaceAPI) return;

  const nativeFetch = window.fetch.bind(window);
  const config = window.PersonalSpaceConfig || {};
  const mode = String(config.API_MODE || "local").toLowerCase();
  const sessionKey = String(
    config.SESSION_STORAGE_KEY || "personalspace.session-token"
  );
  const healthPath = String(config.HEALTH_PATH || "/api/health");
  const healthInterval = Math.max(
    10000,
    Number(config.HEALTHCHECK_INTERVAL_MS || 30000)
  );
  const healthTimeout = Math.max(
    2000,
    Number(config.HEALTHCHECK_TIMEOUT_MS || 6000)
  );

  let backendOnline = null;
  let healthTimer = null;

  const stripTrailingSlashes = (value) =>
    String(value || "").replace(/\/+$/, "");

  function getSessionToken() {
    try {
      return localStorage.getItem(sessionKey) || "";
    } catch (_) {
      return "";
    }
  }

  function setSessionToken(value) {
    try {
      if (value) {
        localStorage.setItem(sessionKey, String(value));
      } else {
        localStorage.removeItem(sessionKey);
      }
    } catch (_) {}
  }

  function clearSessionToken() {
    setSessionToken("");
  }

  function configured() {
    if (mode === "local") return true;

    if (mode === "external") {
      return /^https:\/\//i.test(String(config.API_BASE_URL || ""));
    }

    if (mode === "supabase") {
      return (
        /^https:\/\/[^/]+\.supabase\.co$/i.test(
          String(config.SUPABASE_URL || "")
        ) && Boolean(config.SUPABASE_PUBLISHABLE_KEY)
      );
    }

    return false;
  }

  function target(url) {
    if (mode === "external") {
      return (
        stripTrailingSlashes(config.API_BASE_URL) +
        url.pathname +
        url.search
      );
    }

    if (mode === "supabase") {
      return (
        stripTrailingSlashes(config.SUPABASE_URL) +
        "/functions/v1/" +
        encodeURIComponent(config.EDGE_FUNCTION_NAME || "api-gateway") +
        url.pathname +
        url.search
      );
    }

    return url.href;
  }

  function ensureStatusBanner() {
    if (document.getElementById("personalspace-server-status")) return;

    const style = document.createElement("style");
    style.id = "personalspace-server-status-style";
    style.textContent = `
      #personalspace-server-status {
        position: fixed;
        inset-inline: 16px;
        top: 16px;
        z-index: 2147483647;
        max-width: 720px;
        margin-inline: auto;
        padding: 14px 16px;
        border-radius: 16px;
        background: rgba(20, 25, 38, 0.96);
        color: #fff;
        box-shadow: 0 16px 45px rgba(0,0,0,.24);
        font-family: inherit;
        line-height: 1.8;
        direction: rtl;
        display: none;
        align-items: center;
        gap: 12px;
        backdrop-filter: blur(12px);
      }
      #personalspace-server-status[data-visible="true"] { display: flex; }
      #personalspace-server-status .ps-server-copy { flex: 1; min-width: 0; }
      #personalspace-server-status .ps-server-title {
        font-weight: 800;
        margin-bottom: 2px;
      }
      #personalspace-server-status .ps-server-text {
        font-size: 13px;
        opacity: .88;
      }
      #personalspace-server-status button {
        flex: 0 0 auto;
        border: 0;
        border-radius: 12px;
        padding: 9px 13px;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
        background: #fff;
        color: #111827;
      }
      @media (max-width: 640px) {
        #personalspace-server-status {
          align-items: stretch;
          flex-direction: column;
        }
        #personalspace-server-status button { width: 100%; }
      }
    `;

    const banner = document.createElement("div");
    banner.id = "personalspace-server-status";
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    banner.innerHTML = `
      <div class="ps-server-copy">
        <div class="ps-server-title">سرور موقتاً در دسترس نیست</div>
        <div class="ps-server-text">
          صفحه سایت باز است، اما ورود، ثبت‌نام، فایل‌ها و سایر امکانات آنلاین
          تا روشن شدن سرور PersonalSpace در دسترس نیستند.
        </div>
      </div>
      <button type="button" id="personalspace-server-retry">تلاش مجدد</button>
    `;

    document.head.appendChild(style);
    document.body.appendChild(banner);

    const retry = document.getElementById("personalspace-server-retry");
    if (retry) {
      retry.addEventListener("click", function () {
        checkBackendHealth(true);
      });
    }
  }

  function setBackendState(isOnline) {
    backendOnline = Boolean(isOnline);

    if (mode !== "external" || !document.body) return;

    ensureStatusBanner();

    const banner = document.getElementById("personalspace-server-status");
    if (!banner) return;

    banner.setAttribute(
      "data-visible",
      backendOnline ? "false" : "true"
    );
  }

  function serveoHeaders(baseHeaders) {
    const headers = new Headers(baseHeaders || undefined);

    if (
      mode === "external" &&
      config.SERVEO_SKIP_BROWSER_WARNING !== false
    ) {
      headers.set("serveo-skip-browser-warning", "true");
    }

    return headers;
  }

  async function checkBackendHealth(force) {
    if (mode !== "external" || !configured()) return false;

    if (force && healthTimer !== null) {
      window.clearTimeout(healthTimer);
      healthTimer = null;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      healthTimeout
    );

    try {
      const url =
        stripTrailingSlashes(config.API_BASE_URL) + healthPath;

      const response = await nativeFetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "include",
        cache: "no-store",
        headers: serveoHeaders(),
        signal: controller.signal
      });

      let ok = response.ok;

      if (ok) {
        try {
          const data = await response.clone().json();
          ok = data && data.ok === true;
        } catch (_) {}
      }

      setBackendState(ok);
      return ok;
    } catch (_) {
      setBackendState(false);
      return false;
    } finally {
      window.clearTimeout(timeoutId);

      if (healthTimer !== null) {
        window.clearTimeout(healthTimer);
      }

      healthTimer = window.setTimeout(
        () => checkBackendHealth(false),
        healthInterval
      );
    }
  }

  function offlineResponse() {
    return new Response(
      JSON.stringify({
        ok: false,
        offline: true,
        message:
          "سرور PersonalSpace در حال حاضر در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید."
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );
  }

  async function bridgedFetch(input, init) {
    if (mode === "local") {
      return nativeFetch(input, init);
    }

    let url;

    try {
      url = new URL(
        input instanceof Request ? input.url : String(input),
        window.location.href
      );
    } catch (_) {
      return nativeFetch(input, init);
    }

    // Only rewrite this site's own /api/* calls. Static files and third-party
    // URLs stay untouched.
    if (
      url.origin !== window.location.origin ||
      !url.pathname.startsWith("/api/")
    ) {
      return nativeFetch(input, init);
    }

    if (!configured()) {
      return new Response(
        JSON.stringify({
          ok: false,
          message: "تنظیمات API کامل نیست."
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }

    const options = Object.assign({}, init || {});
    const originalHeaders =
      input instanceof Request ? input.headers : undefined;
    const headers = serveoHeaders(originalHeaders);

    if (options.headers) {
      new Headers(options.headers).forEach((value, key) => {
        headers.set(key, value);
      });
    }

    if (mode === "external") {
      // The Flask session is an HttpOnly Secure SameSite=None cookie issued by
      // the Serveo hostname, so cross-origin API calls must include credentials.
      options.credentials = "include";
      options.mode = "cors";
      headers.set("serveo-skip-browser-warning", "true");
    }

    if (mode === "supabase") {
      headers.set(
        "apikey",
        String(config.SUPABASE_PUBLISHABLE_KEY || "")
      );

      const token = getSessionToken();
      if (token) headers.set("X-Session-Token", token);

      headers.set("X-PersonalSpace-Client", "browser");
      headers.set("X-Original-Origin", window.location.origin);
      headers.delete("X-CSRF-Token");
    }

    options.headers = headers;
    options.cache = "no-store";

    try {
      const response = await nativeFetch(target(url), options);

      if (mode === "external") {
        setBackendState(true);
      }

      if (mode === "supabase") {
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          try {
            const data = await response.clone().json();

            if (data.sessionToken) {
              setSessionToken(data.sessionToken);
            }

            if (
              response.status === 401 ||
              url.pathname === "/api/logout"
            ) {
              clearSessionToken();
            }
          } catch (_) {}
        }
      }

      return response;
    } catch (_) {
      if (mode === "external") {
        setBackendState(false);
        return offlineResponse();
      }
      throw _;
    }
  }

  window.PersonalSpaceAPI = Object.freeze({
    mode,
    configured,
    getSessionToken,
    setSessionToken,
    clearSessionToken,
    nativeFetch,
    checkBackendHealth,
    isBackendOnline: () => backendOnline === true
  });

  window.fetch = bridgedFetch;

  if (mode === "external") {
    const startHealthChecks = function () {
      ensureStatusBanner();
      checkBackendHealth(true);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startHealthChecks, {
        once: true
      });
    } else {
      startHealthChecks();
    }
  }

  console.log("PersonalSpace API Bridge:", mode.toUpperCase());
})();
