/* PersonalSpace public browser configuration.
 * This file is public on GitHub Pages. Never put passwords, private API keys,
 * database URLs, bot tokens, or other secrets here.
 */
(function () {
  "use strict";

  window.PersonalSpaceConfig = Object.freeze({
    // GitHub Pages talks to the Flask backend through the fixed Serveo tunnel.
    API_MODE: "external",
    API_BASE_URL: "https://personalspace.serveousercontent.com",

    // Used by api-bridge.js to show whether the laptop/Flask backend is online.
    HEALTH_PATH: "/api/health",
    HEALTHCHECK_INTERVAL_MS: 30000,
    HEALTHCHECK_TIMEOUT_MS: 6000,
    SERVEO_SKIP_BROWSER_WARNING: true,

    // Keep root paths because the recommended Pages repository is
    // <github-username>.github.io (not a project subfolder).
    SITE_BASE_PATH: "/",

    // Kept only for compatibility with the existing bridge's optional
    // Supabase mode. They are intentionally blank in external mode.
    SUPABASE_URL: "",
    SUPABASE_PUBLISHABLE_KEY: "",
    EDGE_FUNCTION_NAME: "api-gateway",
    SESSION_STORAGE_KEY: "personalspace.session-token"
  });
})();
