import {
  Outlet,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router";
import { useState, useEffect } from "react";
import axios from "axios";
import "../styles.css";

import { AuthContext } from "../utils/authContext";
import NavBar from "../components/layout/navbar/NavBar";
import Footer from "../components/layout/Footer";
import LoadingPage from "../components/layout/LoadingPage";
import ScrollToAnchor from "../hooks/scrollToAnchor";
import { LocationBanner } from "../components/settings/LocationBanner";
import { CompleteProfileModal } from "../components/settings/CompleteProfileModal";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isMapPage = pathname === "/map";
  const isHomePage = pathname === "/";
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState({
    username: "",
    id: 0,
    status: false,
    email: null as string | null,
    locationCountry: null as string | null,
    locationSource: null as string | null,
  });
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");

    if (!accessToken) {
      setLoading(false);
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
            locationSource: response.data.location_source ?? null,
          });
        }
      })
      .catch((err) => {
        console.error("Client: Authentication failed", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <AuthContext.Provider
      value={{
        authState,
        setAuthState,
        loading,
        setLoading,
        searchModalOpen,
        setSearchModalOpen,
      }}
    >
      <ScrollToAnchor />
      <NavBar />
      {/* {!isMapPage && <LocationBanner />} */}
      <Outlet />
      {authState.status && !authState.email && <CompleteProfileModal />}
      {!isMapPage && !isHomePage && <Footer />}
    </AuthContext.Provider>
  );
}
