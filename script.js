document.body.style.visibility = "hidden";

async function fetchWithTimeout(url, options, timeoutMs = 8000) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        window.clearTimeout(timeoutId);
    }
}

function redirectToLogin() {
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(`login.html?returnTo=${encodeURIComponent(returnTo)}`);
}

async function getAuthenticatedSession() {
    try {
        const response = await fetchWithTimeout("/api/auth/session", {
            method: "GET",
            credentials: "same-origin",
            headers: { Accept: "application/json" },
            cache: "no-store"
        });

        if (!response.ok) {
            return null;
        }

        const session = await response.json();
        return session.authenticated === true ? session : null;
    } catch {
        return null;
    }
}

function applyAuthenticatedUser(session) {
    const user = session.user || {};
    const displayName = typeof user.name === "string" && user.name.trim()
        ? user.name.trim()
        : "Authorized user";
    const role = typeof user.role === "string" && user.role.trim()
        ? user.role.trim()
        : "Payroll access";
    const firstName = displayName.split(/\s+/)[0];
    const initials = displayName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "AU";

    const avatar = document.querySelector(".user-card .avatar");
    const userName = document.querySelector(".user-card strong");
    const userRole = document.querySelector(".user-card span");
    const greeting = document.querySelector(".page-heading h1");

    if (avatar) avatar.textContent = initials;
    if (userName) userName.textContent = displayName;
    if (userRole) userRole.textContent = role;
    if (greeting) greeting.textContent = `Good morning, ${firstName}`;
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
        window.location.replace("login.html");
    }
}

function initializeDashboard() {
    const menuButton = document.getElementById("menuButton");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const currentDate = document.getElementById("currentDate");
    const accountButton = document.querySelector(".user-card .icon-button");

    function setSidebarState(isOpen) {
        document.body.classList.toggle("sidebar-open", isOpen);
        sidebarOverlay.hidden = !isOpen;
        menuButton.setAttribute("aria-expanded", String(isOpen));
        menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    }

    menuButton?.addEventListener("click", () => {
        setSidebarState(!document.body.classList.contains("sidebar-open"));
    });

    sidebarOverlay?.addEventListener("click", () => setSidebarState(false));

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            setSidebarState(false);
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 820) {
            setSidebarState(false);
        }
    });

    const dateFormatter = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
    });

    if (currentDate) {
        currentDate.textContent = dateFormatter.format(new Date());
    }

    const navItems = document.querySelectorAll(".sidebar-nav .nav-item");

    navItems.forEach((item) => {
        item.addEventListener("click", () => {
            navItems.forEach((navItem) => {
                navItem.classList.remove("active");
                navItem.removeAttribute("aria-current");
            });

            item.classList.add("active");
            item.setAttribute("aria-current", "page");

            if (window.innerWidth <= 820) {
                setSidebarState(false);
            }
        });
    });

    let toastTimer;

    function showToast(message) {
        let toast = document.querySelector(".toast");

        if (!toast) {
            toast = document.createElement("div");
            toast.className = "toast";
            toast.setAttribute("role", "status");
            toast.setAttribute("aria-live", "polite");
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add("visible");

        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => {
            toast.classList.remove("visible");
        }, 2600);
    }

    document.querySelector(".primary-button")?.addEventListener("click", () => {
        showToast("Payroll workflow will be connected in the next development phase.");
    });

    document.querySelectorAll(".secondary-button, .text-button").forEach((button) => {
        button.addEventListener("click", () => {
            showToast(`${button.textContent.trim()} is ready for backend integration.`);
        });
    });

    if (accountButton) {
        accountButton.textContent = "↪";
        accountButton.setAttribute("aria-label", "Sign out");
        accountButton.setAttribute("title", "Sign out");
        accountButton.addEventListener("click", async () => {
            accountButton.disabled = true;
            await signOut();
        });
    }
}

(async function startProtectedDashboard() {
    const session = await getAuthenticatedSession();

    if (!session) {
        redirectToLogin();
        return;
    }

    applyAuthenticatedUser(session);
    initializeDashboard();
    document.body.style.visibility = "visible";
})();
