const ACCESS_COOKIE = "sl_paytrack_access";
const REFRESH_COOKIE = "sl_paytrack_refresh";
const REMEMBER_COOKIE = "sl_paytrack_remember";

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
