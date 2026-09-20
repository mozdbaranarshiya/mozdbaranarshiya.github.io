(function (global) {
    "use strict";

    const API = {
        csrfToken: "",

        async init() {
            const response = await fetch("/api/session", {
                credentials: "same-origin",
                cache: "no-store"
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.loggedIn) {
                if (window.top === window.self) {
                    window.location.replace("/Login.html");
                }

                throw new Error(
                    data.message || "ابتدا وارد حساب شوید."
                );
            }

            API.csrfToken = data.csrfToken || "";

            return data;
        },

        async request(url, options) {
            const opts = Object.assign({}, options || {});

            opts.credentials = "same-origin";
            opts.cache = "no-store";
            opts.headers = Object.assign({}, opts.headers || {});

            if (
                opts.body &&
                typeof opts.body !== "string" &&
                !(opts.body instanceof FormData)
            ) {
                opts.headers["Content-Type"] = "application/json";
                opts.body = JSON.stringify(opts.body);
            } else if (
                typeof opts.body === "string" &&
                opts.body.trim() &&
                !opts.headers["Content-Type"]
            ) {
                const first = opts.body.trim()[0];

                if (first === "{" || first === "[") {
                    opts.headers["Content-Type"] = "application/json";
                }
            }

            const method = String(
                opts.method || "GET"
            ).toUpperCase();

            if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
                if (!API.csrfToken) {
                    await API.init();
                }

                opts.headers["X-CSRF-Token"] = API.csrfToken;
            }

            const response = await fetch(url, opts);

            const data = await response
                .json()
                .catch(() => ({}));

            if (response.status === 401) {
                if (window.top && window.top !== window.self) {
                    window.top.location.replace("/Login.html");
                } else {
                    window.location.replace("/Login.html");
                }
                throw new Error(data.message || "ابتدا وارد حساب شوید.");
            }

            if (!response.ok || data.ok === false) {
                throw new Error(
                    data.message || "درخواست انجام نشد."
                );
            }

            return data;
        },

        esc(value) {
            return String(
                value == null ? "" : value
            )
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        },

        fa(value) {
            return String(
                value == null ? "" : value
            ).replace(
                /\d/g,
                d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]
            );
        },

        money(value) {
            const n = Number(value || 0);

            return (
                API.fa(
                    n.toLocaleString("en-US")
                ) + " ریال"
            );
        },

        bytes(value) {
            let n = Number(value || 0);

            const units = [
                "B",
                "KB",
                "MB",
                "GB",
                "TB"
            ];

            let i = 0;

            while (
                n >= 1024 &&
                i < units.length - 1
            ) {
                n /= 1024;
                i++;
            }

            const text =
                i === 0
                    ? Math.round(n)
                    : Math.round(n * 10) / 10;

            return (
                API.fa(text) +
                " " +
                units[i]
            );
        },

        date(value) {
            if (!value) {
                return "-";
            }

            try {
                const parsed = new Date(value);
                if (Number.isNaN(parsed.getTime())) {
                    return String(value);
                }
                return parsed.toLocaleString("fa-IR");
            } catch (_) {
                return String(value);
            }
        },

        status(id, text, type) {
            const el =
                document.getElementById(id);

            if (!el) {
                return;
            }

            el.textContent = text || "";

            el.className =
                "portal-status " +
                (type || "");
        }
    };

    global.PortalAPI = API;

})(window);