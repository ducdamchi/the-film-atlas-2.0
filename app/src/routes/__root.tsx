import {
  Outlet,
  createRootRoute,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import "../styles.css";

import { AuthContext } from "../utils/authContext";
import { AppContext } from "../utils/appContext";
import NavBar from "../components/layout/navbar/NavBar";
import Footer from "../components/layout/Footer";
import LoadingPage from "../components/layout/LoadingPage";
import QuickSearchModal from "../components/search/QuickSearchModal";
import ScrollToAnchor from "../hooks/scrollToAnchor";
import useCommandKey from "../hooks/useCommandKey";
import { LocationBanner } from "../components/settings/LocationBanner";
import { CompleteProfileModal } from "../components/settings/CompleteProfileModal";
import { runMigrations } from "../utils/localStorageMigrations";
import { Toaster } from "../components/ui-shadcn/sonner";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "The Film Atlas" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
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
  if (typeof window !== 'undefined') runMigrations();

  const { pathname, isRouterPending } = useRouterState({
    select: (s) => ({
      pathname: s.location.pathname,
      isRouterPending: s.status === "pending",
    }),
  });
  const isMapPage = pathname === "/map";
  const isHomePage = pathname === "/";
  const [authLoading, setAuthLoading] = useState(true);
  const [authState, setAuthState] = useState({
    username: "",
    id: 0,
    status: false,
    email: null as string | null,
    locationCountry: null as string | null,
    locationCity: null as string | null,
    locationSource: null as string | null,
  });
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  useCommandKey(() => setSearchModalOpen((s) => !s), "k");

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");

    if (!accessToken) {
      setAuthLoading(false);
      return;
    }

    axios
      .get("/auth/verify", {
        headers: { accessToken: accessToken },
      })
      .then((response) => {
        if (!response.data.error) {
          setAuthState({
            username: response.data.username,
            id: response.data.id,
            status: true,
            email: response.data.email ?? null,
            locationCountry: response.data.location_country ?? null,
            locationCity: response.data.location_city ?? null,
            locationSource: response.data.location_source ?? null,
          });
        }
      })
      .catch((err) => {
        console.error("Client: Authentication failed", err);
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, []);

  return (
    <RootDocument>
      {authLoading ? (
        <LoadingPage variant="authenticating" />
      ) : (
        <AuthContext.Provider value={{ authState, setAuthState, authLoading }}>
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
            {authState.status && !authState.email && <CompleteProfileModal />}
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
      )}
    </RootDocument>
  );
}
