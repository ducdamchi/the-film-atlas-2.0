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
import { useState, useEffect } from "react"
import { authClient } from "../lib/authClient"
import "../styles.css"

import { AuthContext } from "../utils/authContext"
import { AppContext } from "../utils/appContext"
import NavBar from "../components/layout/navbar/NavBar"
import Footer from "../components/layout/Footer"
import QuickSearchModal from "../components/search/QuickSearchModal"
import ScrollToAnchor from "../hooks/scrollToAnchor"
import useCommandKey from "../hooks/useCommandKey"
import { CompleteProfileModal } from "../components/settings/CompleteProfileModal"
import { runMigrations } from "../utils/localStorageMigrations"
import { Toaster } from "../components/ui-shadcn/sonner"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools"
import {
  SidebarProvider,
  SidebarTrigger,
} from "../components/ui-shadcn/sidebar"
import { AppSidebar } from "#/components/sidebar/AppSidebar"
import { TooltipProvider } from "#/components/ui-shadcn/tooltip"

import { useAtom } from "jotai"
import { sidebarHoveredAtom, sidebarPinnedAtom } from "#/atoms/atoms"

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
  useCommandKey(() => setSearchModalOpen((s) => !s), "k")

  const authState: AuthState = sessionPending
    ? (auth ?? loggedOutState)
    : liveSession
      ? {
          username: liveSession.user.username ?? "",
          id: liveSession.user.id,
          status: true,
          email: liveSession.user.email ?? null,
          locationCountry: (liveSession.user as any).locationCountry ?? null,
          locationCity: (liveSession.user as any).locationCity ?? null,
          locationSource: (liveSession.user as any).locationSource ?? null,
        }
      : loggedOutState

  const [sidebarHovered] = useAtom(sidebarHoveredAtom)
  const [sidebarPinned] = useAtom(sidebarPinnedAtom)
  // useEffect(() => {
  //   console.log("keep sidebar open: ", sidebarHovered || sidebarPinned)
  // }, [sidebarHovered, sidebarPinned])

  return (
    <RootDocument>
      <AuthContext.Provider
        value={{ authState, setAuthState: () => {}, authLoading: false }}>
        <AppContext.Provider value={{ searchModalOpen, setSearchModalOpen }}>
          <TooltipProvider>
            <SidebarProvider open={sidebarHovered || sidebarPinned}>
              <ScrollToAnchor />
              <AppSidebar />

              <main className="group peer w-full">
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
        </AppContext.Provider>
      </AuthContext.Provider>
      <TanStackDevtools
        plugins={[
          {
            name: "TanStack Query",
            render: <ReactQueryDevtoolsPanel />,
          },
        ]}
      />
    </RootDocument>
  )
}
