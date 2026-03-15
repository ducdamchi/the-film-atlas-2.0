import axios from "axios"
import { useState, useEffect } from "react"
import { HashRouter, Route, Routes } from "react-router-dom"
import "./App.css"
import ScrollToAnchor from "./Hooks/scrollToAnchor"

import LoadingPage from "./Components/Shared/Navigation-Search/LoadingPage"
import Films from "./Components/Films"
import Directors from "./Components/Directors"
import FilmLanding from "./Components/FilmLanding"
import PersonLanding from "./Components/PersonLanding"
import Register from "./Components/Register"
import LogIn from "./Components/LogIn"
import MapPage from "./Components/MapPage"
import Footer from "./Components/Shared/Navigation-Search/Footer"
import About from "./Components/About"
import Contact from "./Components/Contact"
import Docs from "./Components/Docs"

import { AuthContext } from "./Utils/authContext"
import Privacy from "./Components/Privacy"
import Terms from "./Components/Terms"

function App() {
  const [loading, setLoading] = useState(true)
  const [authState, setAuthState] = useState({
    username: "",
    id: 0,
    status: false,
  })
  const [searchModalOpen, setSearchModalOpen] = useState(false)

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken")

    /* If user not signed in, exit useEffect hook */
    if (!accessToken) {
      setLoading(false)
      return
    }

    /* Make API call to authenticate user */
    axios
      .get("http://localhost:3002/auth/verify", {
        headers: { accessToken: accessToken },
      })
      .then((response) => {
        // If no error, user successfully logged in
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
    <>
      <AuthContext.Provider
        value={{
          authState,
          setAuthState,
          loading,
          setLoading,
          searchModalOpen,
          setSearchModalOpen,
        }}>
        <HashRouter>
          <ScrollToAnchor />
          <Routes>
            <Route path="/" element={<MapPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/films" element={<Films />} />
            <Route path="/directors" element={<Directors />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/films/:tmdbId" element={<FilmLanding />} />
            <Route path="/person/:job/:tmdbId" element={<PersonLanding />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<LogIn />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
          </Routes>
          <Footer />
        </HashRouter>
      </AuthContext.Provider>
    </>
  )
}

export default App
