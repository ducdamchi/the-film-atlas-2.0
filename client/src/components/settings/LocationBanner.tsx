import { useState } from "react"
import { useAuth } from "@/utils/authContext"
import { decodeToken } from "@/utils/decodeToken"
import { COUNTRIES } from "@/utils/countries"
import { LocationPicker } from "./LocationPicker"

function LocationChangeModal({ onClose }: { onClose: () => void }) {
  const { authState, setAuthState } = useAuth()
  const [country, setCountry] = useState(authState.locationCountry ?? "")
  const [city, setCity] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!country) return
    setLoading(true)
    try {
      const res = await fetch("/profile/me/location", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          accesstoken: localStorage.getItem("accessToken") ?? "",
        },
        body: JSON.stringify({ country, city }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        return
      }
      localStorage.setItem("accessToken", data.token)
      const decoded = decodeToken(data.token)
      if (decoded) setAuthState(decoded)
      onClose()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-overlay/70">
      <div className="bg-surface border border-control rounded-xl p-6 w-full max-w-sm shadow-xl font-primary">
        <h3 className="text-base font-semibold text-body mb-4">Change your region</h3>
        <LocationPicker
          country={country}
          city={city}
          onCountryChange={setCountry}
          onCityChange={setCity}
        />
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        <div className="flex gap-2 mt-5">
          <button
            className="flex-1 bg-body text-on-dark rounded-lg py-2 text-sm font-medium disabled:opacity-40 cursor-pointer"
            onClick={handleSave}
            disabled={!country || !city || loading}>
            {loading ? "Saving..." : "Save"}
          </button>
          <button
            className="flex-1 border border-control text-subtle rounded-lg py-2 text-sm cursor-pointer"
            onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export function LocationBanner() {
  const { authState } = useAuth()
  const [dismissed, setDismissed] = useState(
    () => !!sessionStorage.getItem("locationBannerDismissed"),
  )
  const [pickerOpen, setPickerOpen] = useState(false)

  if (!authState.status || authState.locationSource !== "ip" || dismissed) return null

  const countryName =
    COUNTRIES.find((c) => c.code === authState.locationCountry)?.name ??
    authState.locationCountry

  const dismiss = () => {
    sessionStorage.setItem("locationBannerDismissed", "1")
    setDismissed(true)
  }

  return (
    <>
      <div className="bg-surface border-b border-control px-4 py-2 flex items-center gap-3 text-sm font-primary text-subtle">
        <span>
          Showing content from <strong className="text-body">{countryName}</strong>. Not
          right?
        </span>
        <button
          onClick={() => setPickerOpen(true)}
          className="underline text-body cursor-pointer">
          Change region
        </button>
        <button onClick={dismiss} className="ml-auto text-subtle cursor-pointer">
          ✕
        </button>
      </div>
      {pickerOpen && (
        <LocationChangeModal
          onClose={() => {
            setPickerOpen(false)
            dismiss()
          }}
        />
      )}
    </>
  )
}
