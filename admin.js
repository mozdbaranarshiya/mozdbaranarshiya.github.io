(function () {
    "use strict";

    const API = {
        csrfToken: "",
        manager: null,

        async init() {
            const response = await fetch("/api/session", {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store"
            });

            if (!response.ok) {
                window.top.location.replace("/Login.html");
                throw new Error("AUTH_REQUIRED");
            }

            const session = await response.json();

            if (!session.loggedIn) {
                window.top.location.replace("/Login.html");
                throw new Error("AUTH_REQUIRED");
            }

            if (session.role !== "manager") {
                window.top.location.replace("/panel.html");
                throw new Error("MANAGER_REQUIRED");
            }

            this.csrfToken = session.csrfToken || "";
            this.manager = session;

            return session;
        },

        async request(url, options) {
            options = options || {};

            const method = String(
                options.method || "GET"
            ).toUpperCase();

            const headers = Object.assign(
                {},
                options.headers || {}
            );

            if (
                !["GET", "HEAD", "OPTIONS"].includes(method)
            ) {
                if (!this.csrfToken) {
                    await this.init();
                }
                headers["X-CSRF-Token"] =
                    this.csrfToken;
            }

            let body = options.body;

            if (
                body &&
                typeof body !== "string" &&
                !(body instanceof FormData)
            ) {
                if (!headers["Content-Type"]) {
                    headers["Content-Type"] =
                        "application/json";
                }

                body = JSON.stringify(body);
            } else if (
                typeof body === "string" &&
                body.trim() &&
                !headers["Content-Type"]
            ) {
                /*
                 * تعدادی از صفحات قدیمی AdminAPI بدنه را از قبل با
                 * JSON.stringify می‌سازند. بدون Content-Type، Flask
                 * request.get_json() آن بدنه را JSON تشخیص نمی‌دهد و
                 * اعتبارسنجی‌ها به اشتباه «نامعتبر» برمی‌گردانند.
                 */
                const first = body.trim()[0];

                if (first === "{" || first === "[") {
                    headers["Content-Type"] =
                        "application/json";
                }
            }

            const response = await fetch(
                url,
                {
                    method,
                    credentials: "same-origin",
                    cache: "no-store",
                    headers,
                    body
                }
            );

            let data = {};

            try {
                data = await response.json();
            } catch (_) {
            }

            if (response.status === 401) {
                window.top.location.replace(
                    "/Login.html"
                );

                throw new Error(
                    "ابتدا وارد حساب شوید."
                );
            }

            if (
                response.status === 403 &&
                data.message &&
                data.message.includes("مدیریت")
            ) {
                window.top.location.replace(
                    "/panel.html"
                );

                throw new Error(
                    data.message
                );
            }

            if (
                !response.ok ||
                data.ok === false
            ) {
                throw new Error(
                    data.message ||
                    "درخواست انجام نشد."
                );
            }

            return data;
        },

        formatBytes(bytes) {
            let value =
                Number(bytes || 0);

            if (
                !Number.isFinite(value) ||
                value <= 0
            ) {
                return "۰ MB";
            }

            const units = [
                "B",
                "KB",
                "MB",
                "GB",
                "TB"
            ];

            let i = 0;

            while (
                value >= 1024 &&
                i < units.length - 1
            ) {
                value /= 1024;
                i++;
            }

            const digits =
                value >= 100
                    ? 0
                    : value >= 10
                        ? 1
                        : 2;

            return (
                this.fa(
                    value.toFixed(digits)
                ) +
                " " +
                units[i]
            );
        },

        formatDate(value) {
            if (!value) {
                return "-";
            }

            const date =
                new Date(value);

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return String(value);
            }

            return date.toLocaleString(
                "fa-IR",
                {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );
        },

        fa(value) {
            return String(value).replace(
                /\d/g,
                d =>
                    "۰۱۲۳۴۵۶۷۸۹"[
                        Number(d)
                    ]
            );
        },

        esc(value) {
            return String(
                value == null
                    ? ""
                    : value
            )
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        },

        status(id, text, type) {
            const el =
                document.getElementById(id);

            if (!el) {
                return;
            }

            el.textContent =
                text || "";

            el.className =
                "admin-status";

            if (text) {
                el.classList.add(
                    "show",
                    type || "info"
                );
            }
        },

        qs(name, fallback) {
            const value =
                new URLSearchParams(
                    window.location.search
                ).get(name);

            return value == null
                ? fallback
                : value;
        },

        confirm(message) {
            return window.confirm(
                message
            );
        }
    };

    window.AdminAPI = API;
})();