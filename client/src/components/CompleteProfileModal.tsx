import { useState } from "react"
import { useAuth } from "@/utils/authContext"
import { decodeToken } from "@/utils/decodeToken"
import { LocationPicker } from "./LocationPicker"

export function CompleteProfileModal() {
  const { setAuthState } = useAuth()
  const [email, setEmail] = useState("")
  const [country, setCountry] = useState("")
  const [city, setCity] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email || !country) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/profile/me/complete", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          accesstoken: localStorage.getItem("accessToken") ?? "",
        },
        body: JSON.stringify({ email, country, city }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        return
      }
      localStorage.setItem("accessToken", data.token)
      const decoded = decodeToken(data.token)
      if (decoded) setAuthState(decoded)
      // authState now has email + locationCountry — modal condition is no longer true
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 font-primary">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-8 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-semibold text-stone-100 mb-2">One quick update</h2>
        <p className="text-stone-400 text-sm mb-6">
          We've upgraded Film Atlas. Please add your email and region to keep your account secure
          and see content from your part of the world.
        </p>

        <div className="flex flex-col gap-1 mb-4">
          <label className="text-sm font-medium text-stone-300">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            className="auth-formField bg-white"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <LocationPicker
          country={country}
          city={city}
          onCountryChange={setCountry}
          onCityChange={setCity}
        />

        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

        <button
          className="mt-6 w-full bg-stone-200 text-black rounded-lg py-2.5 text-sm font-medium disabled:opacity-40 cursor-pointer"
          onClick={handleSubmit}
          disabled={!email || !country || !city || loading}>
          {loading ? "Saving..." : "Save and continue"}
        </button>
      </div>
    </div>
  )
}
