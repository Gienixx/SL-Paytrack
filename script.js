const menuButton = document.getElementById("menuButton");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const currentDate = document.getElementById("currentDate");

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
