import {
  Outlet,
  createRootRouteWithContext,
  useRouterState,
  HeadContent,
  Scripts,
  ClientOnly,
} from "@tanstack/react-router";
import type { RouterContext, AuthUser } from "../router";
import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import "../styles.css";

import { AuthContext } from "../utils/authContext";
import { AppContext } from "../utils/appContext";
import NavBar from "../components/layout/navbar/NavBar";
import Footer from "../components/layout/Footer";
import QuickSearchModal from "../components/search/QuickSearchModal";
import ScrollToAnchor from "../hooks/scrollToAnchor";
import useCommandKey from "../hooks/useCommandKey";
import { CompleteProfileModal } from "../components/settings/CompleteProfileModal";
import { runMigrations } from "../utils/localStorageMigrations";
import { Toaster } from "../components/ui-shadcn/sonner";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async (): Promise<{ auth: AuthUser | null }> => {
    if (typeof window === "undefined") return { auth: null };

    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return { auth: null };

    try {
      const { data } = await axios.get("/auth/verify", {
        headers: { accessToken },
      });
      if (!data.error) {
        return {
          auth: {
            username: data.username,
            id: data.id,
            status: true,
            email: data.email ?? null,
            locationCountry: data.location_country ?? null,
            locationCity: data.location_city ?? null,
            locationSource: data.location_source ?? null,
          },
        };
      }
    } catch {
      localStorage.removeItem("accessToken");
    }
    return { auth: null };
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
});

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
  );
}

function RootComponent() {
  useEffect(() => {
    runMigrations();
  }, []);

  const { auth } = Route.useRouteContext();
  const { pathname, isRouterPending } = useRouterState({
    select: (s) => ({
      pathname: s.location.pathname,
      isRouterPending: s.status === "pending",
    }),
  });
  const isMapPage = pathname === "/map";
  const isHomePage = pathname === "/";
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  useCommandKey(() => setSearchModalOpen((s) => !s), "k");

  const authState = auth ?? {
    username: "",
    id: 0,
    status: false,
    email: null,
    locationCountry: null,
    locationCity: null,
    locationSource: null,
  };

  return (
    <RootDocument>
      <AuthContext.Provider
        value={{ authState, setAuthState: () => {}, authLoading: false }}
      >
        <AppContext.Provider value={{ searchModalOpen, setSearchModalOpen }}>
          <ScrollToAnchor />
          <NavBar />
          {searchModalOpen && (
            <QuickSearchModal
              searchModalOpen={searchModalOpen}
              setSearchModalOpen={setSearchModalOpen}
            />
          )}
          {/* {!isMapPage && <LocationBanner />} */}
          <Outlet />
          <ClientOnly>
            {authState.status && !authState.email && <CompleteProfileModal />}
          </ClientOnly>
          <Toaster position="top-right" />
          {!isMapPage && !isHomePage && !isRouterPending && (
            <div
              key={pathname}
              style={{ animation: "footer-fade-in 0.3s ease 0.25s both" }}
            >
              <Footer />
            </div>
          )}
        </AppContext.Provider>
      </AuthContext.Provider>
      <TanStackDevtools
        plugins={[
          {
            name: "TanStack Query",
            render: <ReactQueryDevtoolsPanel />,
          },
          {
            name: "TanStack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </RootDocument>
  );
}
