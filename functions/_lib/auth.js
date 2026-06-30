const ACCESS_COOKIE = "sl_paytrack_access";
const REFRESH_COOKIE = "sl_paytrack_refresh";
const REMEMBER_COOKIE = "sl_paytrack_remember";
const DEV_SESSION_COOKIE = "sl_paytrack_dev_session";

export function jsonResponse(body, status = 200, extraHeaders = {}) {
    const headers = new Headers({
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache",
        ...extraHeaders
    });

    return new Response(JSON.stringify(body), { status, headers });
}

export function requireConfiguration(env) {
    const supabaseUrl = String(env.SUPABASE_URL || "").replace(/\/$/, "");
    const anonKey = String(env.SUPABASE_ANON_KEY || "");

    if (!supabaseUrl || !anonKey) {
        return null;
    }

    return { supabaseUrl, anonKey };
}

export function validateRequestOrigin(request, env) {
    const requestUrl = new URL(request.url);
    const requestOrigin = request.headers.get("Origin");
    const allowedOrigin = String(env.PAYROLL_ALLOWED_ORIGIN || requestUrl.origin).replace(/\/$/, "");

    return Boolean(requestOrigin) && requestOrigin.replace(/\/$/, "") === allowedOrigin;
}

export function parseCookies(request) {
    const cookieHeader = request.headers.get("Cookie") || "";

    return cookieHeader.split(";").reduce((cookies, item) => {
        const separatorIndex = item.indexOf("=");
        if (separatorIndex === -1) {
            return cookies;
        }

        const name = item.slice(0, separatorIndex).trim();
        const value = item.slice(separatorIndex + 1).trim();

        if (name) {
            try {
                cookies[name] = decodeURIComponent(value);
            } catch {
                cookies[name] = value;
            }
        }

        return cookies;
    }, {});
}

function cookieAttributes(request, maxAge) {
    const secure = new URL(request.url).protocol === "https:";
    const attributes = ["Path=/", "HttpOnly", "SameSite=Strict"];

    if (secure) {
        attributes.push("Secure");
    }

    if (Number.isFinite(maxAge)) {
        attributes.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
    }

    return attributes.join("; ");
}

function serializeCookie(request, name, value, maxAge) {
    return `${name}=${encodeURIComponent(value)}; ${cookieAttributes(request, maxAge)}`;
}

export function appendSessionCookies(headers, request, session, rememberMe) {
    const accessMaxAge = Number(session.expires_in) || 3600;
    const refreshMaxAge = rememberMe ? 60 * 60 * 24 * 30 : undefined;

    headers.append("Set-Cookie", serializeCookie(request, ACCESS_COOKIE, session.access_token, accessMaxAge));
    headers.append("Set-Cookie", serializeCookie(request, REFRESH_COOKIE, session.refresh_token, refreshMaxAge));
    headers.append("Set-Cookie", serializeCookie(request, REMEMBER_COOKIE, rememberMe ? "1" : "0", refreshMaxAge));
}

export function appendClearedSessionCookies(headers, request) {
    headers.append("Set-Cookie", serializeCookie(request, ACCESS_COOKIE, "", 0));
    headers.append("Set-Cookie", serializeCookie(request, REFRESH_COOKIE, "", 0));
    headers.append("Set-Cookie", serializeCookie(request, REMEMBER_COOKIE, "", 0));
    headers.append("Set-Cookie", serializeCookie(request, DEV_SESSION_COOKIE, "", 0));
}

export function getSessionCookies(request) {
    const cookies = parseCookies(request);

    return {
        accessToken: cookies[ACCESS_COOKIE] || "",
        refreshToken: cookies[REFRESH_COOKIE] || "",
        rememberMe: cookies[REMEMBER_COOKIE] === "1"
    };
}

export function sanitizeUser(user) {
    const metadata = user?.user_metadata || {};
    const appMetadata = user?.app_metadata || {};
    const email = typeof user?.email === "string" ? user.email : "";
    const fallbackName = email ? email.split("@")[0] : "Authorized user";

    return {
        id: user?.id || "",
        email,
        name: metadata.full_name || metadata.name || fallbackName,
        role: appMetadata.role || "employee"
    };
}

export function isUserAllowed(user, env) {
    const email = String(user?.email || "").toLowerCase();
    const allowedDomain = String(env.PAYROLL_ALLOWED_EMAIL_DOMAIN || "").trim().toLowerCase();
    const allowedRoles = String(env.PAYROLL_ALLOWED_ROLES || "")
        .split(",")
        .map((role) => role.trim().toLowerCase())
        .filter(Boolean);
    const role = String(user?.app_metadata?.role || "employee").toLowerCase();

    if (allowedDomain && !email.endsWith(`@${allowedDomain}`)) {
        return false;
    }

    return allowedRoles.length === 0 || allowedRoles.includes(role);
}

export async function supabaseRequest(configuration, path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("apikey", configuration.anonKey);
    headers.set("Accept", "application/json");

    return fetch(`${configuration.supabaseUrl}${path}`, {
        ...options,
        headers
    });
}

function getDevConfiguration(env) {
    const enabled = String(env.DEV_AUTH_ENABLED || "").toLowerCase() === "true";
    const email = String(env.DEV_AUTH_EMAIL || "").trim().toLowerCase();
    const password = String(env.DEV_AUTH_PASSWORD || "");
    const secret = String(env.DEV_AUTH_SECRET || "");
    const name = String(env.DEV_AUTH_NAME || "Development Admin").trim() || "Development Admin";
    const role = String(env.DEV_AUTH_ROLE || "admin").trim().toLowerCase() || "admin";

    if (!enabled || !email || password.length < 8 || secret.length < 32) {
        return null;
    }

    return { email, password, secret, name, role };
}

export function isDevAuthEnabled(env) {
    return Boolean(getDevConfiguration(env));
}

export function authenticateDevCredentials(email, password, env) {
    const configuration = getDevConfiguration(env);
    if (!configuration) {
        return null;
    }

    if (String(email || "").trim().toLowerCase() !== configuration.email || password !== configuration.password) {
        return null;
    }

    return {
        id: `dev:${configuration.email}`,
        email: configuration.email,
        name: configuration.name,
        role: configuration.role
    };
}

function bytesToBase64Url(bytes) {
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - normalized.length % 4) % 4);
    const binary = atob(normalized + padding);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodePayload(value) {
    return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function decodePayload(value) {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)));
}

async function importSigningKey(secret) {
    return crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
    );
}

async function signValue(value, secret) {
    const key = await importSigningKey(secret);
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
    return bytesToBase64Url(new Uint8Array(signature));
}

async function verifySignature(value, signature, secret) {
    const key = await importSigningKey(secret);
    return crypto.subtle.verify(
        "HMAC",
        key,
        base64UrlToBytes(signature),
        new TextEncoder().encode(value)
    );
}

export async function appendDevSessionCookie(headers, request, user, env, rememberMe) {
    const configuration = getDevConfiguration(env);
    if (!configuration) {
        throw new Error("Development authentication is not configured.");
    }

    const maxAge = rememberMe ? 60 * 60 * 24 * 7 : 60 * 60 * 8;
    const payload = encodePayload({
        user,
        exp: Math.floor(Date.now() / 1000) + maxAge
    });
    const signature = await signValue(payload, configuration.secret);

    headers.append("Set-Cookie", serializeCookie(request, DEV_SESSION_COOKIE, `${payload}.${signature}`, maxAge));
}

export async function getDevSession(request, env) {
    const configuration = getDevConfiguration(env);
    if (!configuration) {
        return null;
    }

    const token = parseCookies(request)[DEV_SESSION_COOKIE] || "";
    const [payload, signature, extra] = token.split(".");

    if (!payload || !signature || extra) {
        return null;
    }

    try {
        const isValid = await verifySignature(payload, signature, configuration.secret);
        if (!isValid) {
            return null;
        }

        const session = decodePayload(payload);
        if (!session?.user || !Number.isFinite(session.exp) || session.exp <= Math.floor(Date.now() / 1000)) {
            return null;
        }

        if (
            String(session.user.email || "").toLowerCase() !== configuration.email ||
            String(session.user.role || "").toLowerCase() !== configuration.role
        ) {
            return null;
        }

        return session.user;
    } catch {
        return null;
    }
}
