(function protectDashboard() {
    const loginPath = "login.html";

    function buildLoginUrl() {
        const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        return `${loginPath}?returnTo=${encodeURIComponent(returnTo)}`;
    }

    function redirectToLogin() {
        window.location.replace(buildLoginUrl());
    }

    async function fetchWithTimeout(url, options, timeoutMs = 8000) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

        try {
            return await fetch(url, { ...options, signal: controller.signal });
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    function applyUserProfile(session) {
        const user = session.user || {};
        const displayName = typeof user.name === "string" && user.name.trim() ? user.name.trim() : "Authorized user";
        const role = typeof user.role === "string" && user.role.trim() ? user.role.trim() : "Payroll access";
        const initials = displayName
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("") || "AU";

        document.querySelectorAll("[data-user-name]").forEach((element) => {
            element.textContent = displayName;
        });

        document.querySelectorAll("[data-user-role]").forEach((element) => {
            element.textContent = role;
        });

        document.querySelectorAll("[data-user-initials]").forEach((element) => {
            element.textContent = initials;
        });
    }

    async function verifySession() {
        try {
            const response = await fetchWithTimeout("/api/auth/session", {
                method: "GET",
                credentials: "same-origin",
                headers: { Accept: "application/json" },
                cache: "no-store"
            });

            if (!response.ok) {
                redirectToLogin();
                return;
            }

            const session = await response.json();
            if (session.authenticated !== true) {
                redirectToLogin();
                return;
            }

            applyUserProfile(session);
            document.documentElement.classList.remove("auth-checking");
        } catch {
            redirectToLogin();
        }
    }

    async function signOut() {
        try {
            await fetchWithTimeout("/api/auth/logout", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json"
                },
                body: "{}"
            }, 5000);
        } finally {
            window.location.replace(loginPath);
        }
    }

    window.SLAuth = Object.freeze({ signOut });
    verifySession();
})();
