import {
    appendClearedSessionCookies,
    getSessionCookies,
    requireConfiguration,
    supabaseRequest,
    validateRequestOrigin
} from "../../_lib/auth.js";

export async function onRequestPost(context) {
    const { request, env } = context;

    if (!validateRequestOrigin(request, env)) {
        return new Response(JSON.stringify({ success: false }), {
            status: 403,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store, max-age=0"
            }
        });
    }

    const headers = new Headers({
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache"
    });

    appendClearedSessionCookies(headers, request);

    const configuration = requireConfiguration(env);
    const { accessToken } = getSessionCookies(request);

    if (configuration && accessToken) {
        try {
            await supabaseRequest(configuration, "/auth/v1/logout", {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}` }
            });
        } catch {
            // Local cookies are cleared even if the upstream sign-out request fails.
        }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
}
