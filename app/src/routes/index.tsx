import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import MapPage from "../components/MapPage"

function ClientOnlyMap() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  return mounted ? <MapPage /> : null
}

export const Route = createFileRoute("/")({
  component: ClientOnlyMap,
})
