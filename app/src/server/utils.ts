// Shared auth header helper for all server function files.
// Must be called from within a createServerFn handler — getRequestHeaders() reads from
// AsyncLocalStorage bound to the current request by TanStack Start's runtime. Calling
// it outside that call chain returns undefined and the forwarded cookie will be empty.
import { getRequestHeaders } from "@tanstack/react-start/server"

// Extracts the browser's HttpOnly session cookie from the incoming app-server request
// and returns it as a header object. Express's fromNodeHeaders(req.headers) reads it
// and calls auth.api.getSession() — the same validation path used for direct requests.
export function apiHeaders(): { cookie: string } {
  const cookie = getRequestHeaders().get("cookie") ?? ""
  return { cookie }
}
