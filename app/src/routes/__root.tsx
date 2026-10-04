import {
  Outlet,
  createRootRouteWithContext,
  useRouterState,
  HeadContent,
  Scripts,
  ClientOnly,
  useRouter,
} from "@tanstack/react-router"
import type { RouterContext, AuthUser } from "../router"
import type { AuthState } from "../types/auth"
import type { ReactNode } from "react"
import { useState, useEffect, useRef } from "react"
import { authClient } from "../lib/authClient"
import "../styles.css"

import { AuthContext } from "../utils/authContext"
import { AppContext } from "../utils/appContext"
import NavBar from "../components/layout/navbar/NavBar"
import Footer from "../components/layout/Footer"
import QuickSearchModal from "../components/search/QuickSearchModal"
import ScrollToAnchor from "../hooks/scrollToAnchor"
import useCommandKey from "../hooks/useCommandKey"
import { CompleteProfileModal } from "../pages/settings/components/CompleteProfileModal"
import { GuestLimitModal } from "../components/auth/GuestLimitModal"
import { runMigrations } from "../utils/localStorageMigrations"
import { getGuestData } from "../utils/guestStore"
import {
  syncGuestDataIfPresent,
  clearGuestDataQuietly,
} from "../utils/syncGuestData"
import { useQueryClient } from "@tanstack/react-query"
import { Toaster } from "../components/ui-shadcn/sonner"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools"
import { SidebarProvider } from "../components/ui-shadcn/sidebar"
import { AppSidebar } from "#/components/sidebar/AppSidebar"
import { MobileBottomNav } from "#/components/mobile/MobileBottomNav"
import { MobileTopHeader } from "#/components/mobile/MobileTopHeader"
import { MobileAccountDrawer } from "#/components/mobile/MobileAccountDrawer"
import { TooltipProvider } from "#/components/ui-shadcn/tooltip"

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async (): Promise<{ auth: AuthUser | null }> => {
    if (typeof window === "undefined") return { auth: null }

    try {
      const { data: session } = await authClient.getSession()
      if (!session) return { auth: null }

      return {
        auth: {
          username: session.user.username ?? "",
          id: session.user.id,
          status: true,
          email: session.user.email ?? null,
          image: session.user.image ?? null,
          locationCountry: (session.user as any).locationCountry ?? null,
          locationCity: (session.user as any).locationCity ?? null,
          locationSource: (session.user as any).locationSource ?? null,
        },
      }
    } catch {
      return { auth: null }
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "The Film Atlas" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/official-logo.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Anta&family=Bruno+Ace+SC&family=Cal+Sans&family=GFS+Neohellenic:ital,wght@0,400;0,700;1,400;1,700&family=Goldman:wght@400;700&family=Outfit:wght@100..900&family=Poller+One&family=Rammetto+One&family=Red+Rose:wght@300..700&family=Righteous&display=swap",
      },
    ],
  }),
  component: RootComponent,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <div id="trailerModal" />
        <Scripts />
      </body>
    </html>
  )
}

const loggedOutState: AuthState = {
  username: "",
  id: "",
  status: false,
  email: null,
  image: null,
  locationCountry: null,
  locationCity: null,
  locationSource: null,
}

function RootComponent() {
  const router = useRouter()

  useEffect(() => {
    runMigrations()

    router.invalidate()
  }, [])

  const { auth } = Route.useRouteContext()
  const { data: liveSession, isPending: sessionPending } =
    authClient.useSession()
  const { pathname, isRouterPending } = useRouterState({
    select: (s) => ({
      pathname: s.location.pathname,
      isRouterPending: s.status === "pending",
    }),
  })
  const isMapPage = pathname === "/map"
  const isHomePage = pathname === "/"
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false)
  useCommandKey(() => setSearchModalOpen((s) => !s), "k")

  const queryClient = useQueryClient()

  const authState: AuthState = sessionPending
    ? (auth ?? loggedOutState)
    : liveSession
      ? {
          username: liveSession.user.username ?? "",
          id: liveSession.user.id,
          status: true,
          email: liveSession.user.email ?? null,
          image: liveSession.user.image ?? null,
          locationCountry: (liveSession.user as any).locationCountry ?? null,
          locationCity: (liveSession.user as any).locationCity ?? null,
          locationSource: (liveSession.user as any).locationSource ?? null,
        }
      : loggedOutState

  // Handle guest data sync after Google OAuth redirects.
  // Email login is handled in login-form.tsx; this only catches the
  // OAuth case where a full-page redirect bypasses the login form entirely.
  const prevAuthStatus = useRef(authState.status)
  useEffect(() => {
    const wasLoggedOut = !prevAuthStatus.current
    prevAuthStatus.current = authState.status

    if (!wasLoggedOut || !authState.status || !liveSession) return

    const guestData = getGuestData()
    const hasGuestData =
      guestData.watched.length > 0 || guestData.watchlisted.length > 0
    if (!hasGuestData) return

    const createdAt = (liveSession.user as any).createdAt
    if (!createdAt) {
      clearGuestDataQuietly(queryClient)
      return
    }

    const ageMs = Date.now() - new Date(createdAt).getTime()
    const isNewAccount = ageMs < 60_000

    if (isNewAccount) {
      syncGuestDataIfPresent(queryClient)
    } else {
      clearGuestDataQuietly(queryClient)
    }
  }, [authState.status])

  return (
    <RootDocument>
      <AuthContext.Provider
        value={{ authState, setAuthState: () => {}, authLoading: false }}>
        <AppContext.Provider value={{ searchModalOpen, setSearchModalOpen }}>
          <TooltipProvider>
            <SidebarProvider>
              <ScrollToAnchor />
              <AppSidebar />

              <main className="group peer w-full pb-14 pt-12 md:pb-0 md:pt-0">
                {/* <NavBar /> */}
                {searchModalOpen && (
                  <QuickSearchModal
                    searchModalOpen={searchModalOpen}
                    setSearchModalOpen={setSearchModalOpen}
                  />
                )}
                {/* {!isMapPage && <LocationBanner />} */}
                <Outlet />
                <ClientOnly>
                  {authState.status && !authState.email && (
                    <CompleteProfileModal />
                  )}
                  {!authState.status && <GuestLimitModal />}
                </ClientOnly>
                <Toaster position="top-right" />
                {/* {!isMapPage && !isHomePage && !isRouterPending && (
                  <div
                    key={pathname}
                    style={{
                      animation: "footer-fade-in 0.3s ease 0.25s both",
                    }}>
                    <Footer />
                  </div>
                )} */}
              </main>
            </SidebarProvider>
          </TooltipProvider>
          <MobileTopHeader onAvatarClick={() => setAccountDrawerOpen(true)} drawerOpen={accountDrawerOpen} />
          <MobileAccountDrawer
            open={accountDrawerOpen}
            onOpenChange={setAccountDrawerOpen}
          />
          <MobileBottomNav />
        </AppContext.Provider>
      </AuthContext.Provider>
      {/* <TanStackDevtools
        plugins={[
          {
            name: "TanStack Query",
            render: <ReactQueryDevtoolsPanel />,
          },
        ]}
      /> */}
    </RootDocument>
  )
}
