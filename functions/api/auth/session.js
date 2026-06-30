import {
    appendClearedSessionCookies,
    appendSessionCookies,
    getDevSession,
    getSessionCookies,
    isDevAuthEnabled,
    isUserAllowed,
    jsonResponse,
    requireConfiguration,
    sanitizeUser,
    supabaseRequest
} from "../../_lib/auth.js";

function responseWithCookies(request, body, status, cookieHandler) {
    const headers = new Headers({
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache"
    });

    cookieHandler?.(headers);
    return new Response(JSON.stringify(body), { status, headers });
}

async function getUser(configuration, accessToken) {
    return supabaseRequest(configuration, "/auth/v1/user", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` }
    });
}

async function refreshSession(configuration, refreshToken) {
    return supabaseRequest(configuration, "/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken })
    });
}

export async function onRequestGet(context) {
    const { request, env } = context;

    const developmentUser = await getDevSession(request, env);
    if (developmentUser) {
        return jsonResponse({
            authenticated: true,
            user: developmentUser,
            developmentMode: true
        });
    }

    const configuration = requireConfiguration(env);
    if (!configuration) {
        if (isDevAuthEnabled(env)) {
            return responseWithCookies(request, { authenticated: false }, 401, (headers) => {
                appendClearedSessionCookies(headers, request);
            });
        }

        return jsonResponse({ authenticated: false, message: "Authentication service is not configured." }, 503);
    }

    const sessionCookies = getSessionCookies(request);
    if (!sessionCookies.accessToken && !sessionCookies.refreshToken) {
        return jsonResponse({ authenticated: false }, 401);
    }

    if (sessionCookies.accessToken) {
        try {
            const userResponse = await getUser(configuration, sessionCookies.accessToken);

            if (userResponse.ok) {
                const user = await userResponse.json();

                if (!isUserAllowed(user, env)) {
                    return responseWithCookies(request, { authenticated: false }, 403, (headers) => {
                        appendClearedSessionCookies(headers, request);
                    });
                }

                return jsonResponse({ authenticated: true, user: sanitizeUser(user) });
            }

            if (userResponse.status !== 401 && userResponse.status !== 403) {
                return jsonResponse({ authenticated: false, message: "Authentication service unavailable." }, 503);
            }
        } catch {
            return jsonResponse({ authenticated: false, message: "Authentication service unavailable." }, 503);
        }
    }

    if (!sessionCookies.refreshToken) {
        return responseWithCookies(request, { authenticated: false }, 401, (headers) => {
            appendClearedSessionCookies(headers, request);
        });
    }

    let refreshResponse;
    try {
        refreshResponse = await refreshSession(configuration, sessionCookies.refreshToken);
    } catch {
        return jsonResponse({ authenticated: false, message: "Authentication service unavailable." }, 503);
    }

    if (!refreshResponse.ok) {
        return responseWithCookies(request, { authenticated: false }, 401, (headers) => {
            appendClearedSessionCookies(headers, request);
        });
    }

    let refreshedSession;
    try {
        refreshedSession = await refreshResponse.json();
    } catch {
        return responseWithCookies(request, { authenticated: false }, 401, (headers) => {
            appendClearedSessionCookies(headers, request);
        });
    }

    if (
        !refreshedSession.access_token ||
        !refreshedSession.refresh_token ||
        !refreshedSession.user ||
        !isUserAllowed(refreshedSession.user, env)
    ) {
        return responseWithCookies(request, { authenticated: false }, 403, (headers) => {
            appendClearedSessionCookies(headers, request);
        });
    }

    return responseWithCookies(request, {
        authenticated: true,
        user: sanitizeUser(refreshedSession.user)
    }, 200, (headers) => {
        appendSessionCookies(headers, request, refreshedSession, sessionCookies.rememberMe);
    });
}
