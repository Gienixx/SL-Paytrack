const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const rememberMeInput = document.getElementById("rememberMe");
const passwordToggle = document.getElementById("passwordToggle");
const forgotPasswordButton = document.getElementById("forgotPasswordButton");
const submitButton = document.getElementById("submitButton");
const formAlert = document.getElementById("formAlert");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");

function showAlert(message, type = "error") {
    formAlert.textContent = message;
    formAlert.dataset.type = type;
    formAlert.hidden = false;
}

function hideAlert() {
    formAlert.hidden = true;
    formAlert.textContent = "";
    delete formAlert.dataset.type;
}

function setFieldError(input, errorElement, message = "") {
    errorElement.textContent = message;
    input.setAttribute("aria-invalid", String(Boolean(message)));
}

function validateForm() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    let isValid = true;

    setFieldError(emailInput, emailError);
    setFieldError(passwordInput, passwordError);

    if (!email) {
        setFieldError(emailInput, emailError, "Enter your work email address.");
        isValid = false;
    } else if (!emailInput.validity.valid) {
        setFieldError(emailInput, emailError, "Enter a valid email address.");
        isValid = false;
    }

    if (!password) {
        setFieldError(passwordInput, passwordError, "Enter your password.");
        isValid = false;
    } else if (password.length < 8) {
        setFieldError(passwordInput, passwordError, "Password must contain at least 8 characters.");
        isValid = false;
    }

    return isValid;
}

function getSafeReturnPath() {
    const requestedPath = new URLSearchParams(window.location.search).get("returnTo");

    if (!requestedPath || !requestedPath.startsWith("/") || requestedPath.startsWith("//")) {
        return "index.html";
    }

    try {
        const target = new URL(requestedPath, window.location.origin);
        return target.origin === window.location.origin
            ? `${target.pathname}${target.search}${target.hash}`
            : "index.html";
    } catch {
        return "index.html";
    }
}

async function fetchWithTimeout(url, options, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        window.clearTimeout(timeoutId);
    }
}

async function checkExistingSession() {
    try {
        const response = await fetchWithTimeout("/api/auth/session", {
            method: "GET",
            credentials: "same-origin",
            headers: { Accept: "application/json" },
            cache: "no-store"
        }, 5000);

        if (!response.ok) {
            return;
        }

        const session = await response.json();
        if (session.authenticated === true) {
            window.location.replace(getSafeReturnPath());
        }
    } catch {
        // Remain on the login page when the session service is unavailable.
    }
}

passwordToggle.addEventListener("click", () => {
    const shouldShowPassword = passwordInput.type === "password";
    passwordInput.type = shouldShowPassword ? "text" : "password";
    passwordToggle.setAttribute("aria-label", shouldShowPassword ? "Hide password" : "Show password");
    passwordToggle.setAttribute("aria-pressed", String(shouldShowPassword));
    passwordInput.focus();
});

forgotPasswordButton.addEventListener("click", () => {
    showAlert("Password recovery will be sent through the approved company recovery process once the authentication service is connected.", "info");
});

emailInput.addEventListener("input", () => setFieldError(emailInput, emailError));
passwordInput.addEventListener("input", () => setFieldError(passwordInput, passwordError));

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideAlert();

    if (!validateForm()) {
        loginForm.querySelector('[aria-invalid="true"]')?.focus();
        return;
    }

    submitButton.disabled = true;
    submitButton.querySelector("span").textContent = "Verifying account…";

    try {
        const response = await fetchWithTimeout("/api/auth/login", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: emailInput.value.trim().toLowerCase(),
                password: passwordInput.value,
                rememberMe: rememberMeInput.checked
            })
        });

        if (response.status === 429) {
            showAlert("Too many sign-in attempts. Please wait before trying again.");
            return;
        }

        if (!response.ok) {
            showAlert("Unable to sign in with those credentials. Check your details and try again.");
            return;
        }

        const result = await response.json();
        if (result.authenticated !== true) {
            showAlert("Unable to sign in with those credentials. Check your details and try again.");
            return;
        }

        passwordInput.value = "";
        window.location.replace(getSafeReturnPath());
    } catch (error) {
        const message = error.name === "AbortError"
            ? "The authentication request timed out. Please try again."
            : "The authentication service is not available yet. Connect the server endpoints before using payroll sign-in.";
        showAlert(message);
    } finally {
        submitButton.disabled = false;
        submitButton.querySelector("span").textContent = "Sign in securely";
    }
});

checkExistingSession();
