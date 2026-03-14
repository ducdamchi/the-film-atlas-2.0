import { Outlet, createRootRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import axios from "axios"
import "../styles.css"

import { AuthContext } from "../Utils/authContext"
// @ts-ignore - JS component
import NavBar from "../components/Shared/Navigation-Search/NavBar.jsx"
// @ts-ignore - JS component
import Footer from "../components/Shared/Navigation-Search/Footer.jsx"
// @ts-ignore - JS component
import LoadingPage from "../components/Shared/Navigation-Search/LoadingPage.jsx"
// @ts-ignore - JS hook
import ScrollToAnchor from "../Hooks/scrollToAnchor.js"

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const [loading, setLoading] = useState(true)
  const [authState, setAuthState] = useState({
    username: "",
    id: 0,
    status: false,
  })
  const [searchModalOpen, setSearchModalOpen] = useState(false)

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken")

    if (!accessToken) {
      setLoading(false)
      return
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
          })
        }
      })
      .catch((err) => {
        console.error("Client: Authentication failed", err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <LoadingPage />
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
      }}>
      <ScrollToAnchor />
      <NavBar />
      <Outlet />
      <Footer />
    </AuthContext.Provider>
  )
}
