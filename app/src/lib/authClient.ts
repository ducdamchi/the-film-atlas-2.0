import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

// The bearer token lives in module memory only — never localStorage or
// sessionStorage. On hard refresh this resets to null, but authClient sends
// credentials: "include" by default, so the browser forwards the session
// cookie to the API on the first getSession() call. BetterAuth's bearer
// plugin after-hook detects the re-issued set-cookie and adds set-auth-token
// to the response, repopulating this variable before any protected request
// is made.
let bearerToken: string | null = null;

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL,
  plugins: [usernameClient()],
  fetchOptions: {
    onSuccess: (ctx) => {
      const token = ctx.response.headers.get("set-auth-token");
      if (token) bearerToken = token;
    },
    auth: {
      type: "Bearer",
      token: () => bearerToken ?? "",
    },
  },
});

export function clearAuthToken() {
  bearerToken = null;
}

export type BetterAuthSession = typeof authClient.$Infer.Session;
