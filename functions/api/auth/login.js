import {
    appendClearedSessionCookies,
    appendDevSessionCookie,
    appendSessionCookies,
    authenticateDevCredentials,
    isDevAuthEnabled,
    isUserAllowed,
    jsonResponse,
    requireConfiguration,
    sanitizeUser,
    supabaseRequest,
    validateRequestOrigin
} from "../../_lib/auth.js";

const MAX_REQUEST_BYTES = 10_000;

function authenticatedResponse(request, session, rememberMe) {
    const headers = new Headers({
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache"
    });

    appendSessionCookies(headers, request, session, rememberMe);

    return new Response(JSON.stringify({
        authenticated: true,
        user: sanitizeUser(session.user)
    }), { status: 200, headers });
}

async function developmentAuthenticatedResponse(request, user, env, rememberMe) {
    const headers = new Headers({
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache"
    });

    appendClearedSessionCookies(headers, request);
    await appendDevSessionCookie(headers, request, user, env, rememberMe);

    return new Response(JSON.stringify({
        authenticated: true,
        user
    }), { status: 200, headers });
}

function deniedResponse(request, status = 401) {
    const headers = new Headers({
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, max-age=0"
    });

    appendClearedSessionCookies(headers, request);

    return new Response(JSON.stringify({
        authenticated: false,
        message: "Unable to sign in with those credentials."
    }), { status, headers });
}

export async function onRequestPost(context) {
    const { request, env } = context;

    if (!validateRequestOrigin(request, env)) {
        return jsonResponse({ authenticated: false, message: "Request origin rejected." }, 403);
    }

    const contentType = request.headers.get("Content-Type") || "";
    const contentLength = Number(request.headers.get("Content-Length") || 0);

    if (!contentType.toLowerCase().includes("application/json") || contentLength > MAX_REQUEST_BYTES) {
        return jsonResponse({ authenticated: false, message: "Invalid request." }, 400);
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ authenticated: false, message: "Invalid request." }, 400);
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const rememberMe = body.rememberMe === true;

    if (!email || email.length > 254 || password.length < 8 || password.length > 128) {
        return deniedResponse(request);
    }

    const allowedDomain = String(env.PAYROLL_ALLOWED_EMAIL_DOMAIN || "").trim().toLowerCase();
    if (allowedDomain && !email.endsWith(`@${allowedDomain}`)) {
        return deniedResponse(request);
    }

    const developmentUser = authenticateDevCredentials(email, password, env);
    if (developmentUser) {
        return developmentAuthenticatedResponse(request, developmentUser, env, rememberMe);
    }

    const configuration = requireConfiguration(env);
    if (!configuration) {
        return isDevAuthEnabled(env)
            ? deniedResponse(request)
            : jsonResponse({
                authenticated: false,
                message: "Authentication service is not configured."
            }, 503);
    }

    let authResponse;
    try {
        authResponse = await supabaseRequest(configuration, "/auth/v1/token?grant_type=password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
    } catch {
        return jsonResponse({ authenticated: false, message: "Authentication service unavailable." }, 503);
    }

    if (authResponse.status === 429) {
        return jsonResponse({ authenticated: false, message: "Too many sign-in attempts." }, 429);
    }

    if (!authResponse.ok) {
        return deniedResponse(request);
    }

    let session;
    try {
        session = await authResponse.json();
    } catch {
        return jsonResponse({ authenticated: false, message: "Invalid authentication response." }, 502);
    }

    if (!session.access_token || !session.refresh_token || !session.user || !isUserAllowed(session.user, env)) {
        return deniedResponse(request, 403);
    }

    return authenticatedResponse(request, session, rememberMe);
}
