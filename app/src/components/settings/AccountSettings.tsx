import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/utils/authContext"
import NavBar from "@/components/layout/navbar/NavBar"
import { useNavigate } from "@tanstack/react-router"
import { LocationPicker } from "./LocationPicker"
import { authClient } from "@/lib/authClient"

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border   bg-background rounded-none p-6">
      <h2 className="text-base font-semibold text-body mb-4">{title}</h2>
      {children}
    </section>
  )
}

function StatusMessage({ success, error }: { success: string; error: string }) {
  if (success) return <p className="text-success text-sm mt-2">{success}</p>
  if (error) return <p className="text-error text-sm mt-2">{error}</p>
  return null
}

function ChangeUsername() {
  const { authState } = useAuth()
  const [username, setUsername] = useState(authState.username)
  const [isEditing, setIsEditing] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const handleEdit = () => {
    setIsEditing(true)
    setSuccess("")
    setError("")
  }

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const handleFormBlur = (e: React.FocusEvent<HTMLFormElement>) => {
    if (!formRef.current?.contains(e.relatedTarget)) {
      setIsEditing(false)
      setUsername(authState.username)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setUsername(authState.username)
    setSuccess("")
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccess("")
    setError("")
    setLoading(true)
    try {
      const { error: updateError } = await authClient.updateUser({
        username,
      } as any)
      if (updateError) {
        setError(updateError.message)
        return
      }
      setSuccess("Username updated.")
      setIsEditing(false)
    } catch {
      setError("Error updating username.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onBlur={handleFormBlur}
      className="flex flex-col gap-3">
      <div className="flex w-[18rem]">
        <input
          ref={inputRef}
          className={`auth-formField   border-r-0 w-full transition-opacity ${!isEditing ? "cursor-not-allowed text-dark/80" : ""}`}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="New username"
          minLength={3}
          maxLength={30}
          readOnly={!isEditing}
        />
        {isEditing ? (
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center justify-center min-w-[4rem] px-3 bg-red-800 text-light text-sm hover:bg-red-800/90 transition-colors cursor-pointer">
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={handleEdit}
            className="flex items-center justify-center min-w-[4rem] px-3 bg-dark text-light text-sm hover:bg-dark/90 transition-colors cursor-pointer">
            Edit
          </button>
        )}
      </div>
      <StatusMessage success={success} error={error} />
      <button
        type="submit"
        disabled={loading || !isEditing || username === authState.username}
        className={`accountSettings-formSubmitButton disabled:cursor-not-allowed`}>
        {loading ? "Saving..." : "Update username"}
      </button>
    </form>
  )
}

function ChangePassword() {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccess("")
    setError("")
    if (next !== confirm) {
      setError("New passwords do not match.")
      return
    }
    setLoading(true)
    try {
      const { error: changeError } = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
      })
      if (changeError) {
        setError(changeError.message)
        return
      }
      setSuccess("Password updated.")
      setCurrent("")
      setNext("")
      setConfirm("")
    } catch {
      setError("Error updating password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        className="auth-formField  "
        type="password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        placeholder="Current password *"
      />
      <input
        className="auth-formField  "
        type="password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        placeholder="New password *"
        minLength={8}
      />
      <input
        className="auth-formField  "
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirm new password *"
      />
      <StatusMessage success={success} error={error} />
      <button
        type="submit"
        disabled={loading || !current || !next || !confirm}
        className=" accountSettings-formSubmitButton disabled:cursor-not-allowed">
        {loading ? "Saving..." : "Update password"}
      </button>
    </form>
  )
}

function ChangeRegion() {
  const { authState } = useAuth()
  const [country, setCountry] = useState(authState.locationCountry ?? "")
  const [city, setCity] = useState(authState.locationCity ?? "")
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccess("")
    setError("")
    setLoading(true)
    try {
      const { error: updateError } = await authClient.updateUser({
        locationCountry: country,
        locationCity: city,
        locationSource: "manual",
      } as any)
      if (updateError) {
        setError(updateError.message)
        return
      }
      setSuccess("Region updated.")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <LocationPicker
        country={country}
        city={city}
        onCountryChange={setCountry}
        onCityChange={setCity}
      />
      <StatusMessage success={success} error={error} />
      <button
        type="submit"
        disabled={
          loading ||
          !country ||
          !city ||
          (country === authState.locationCountry &&
            city === authState.locationCity)
        }
        className="accountSettings-formSubmitButton disabled:cursor-not-allowed">
        {loading ? "Saving..." : "Update region"}
      </button>
    </form>
  )
}

export function AccountSettings() {
  const { authState } = useAuth()
  const navigate = useNavigate()

  if (!authState.status) {
    navigate({ to: "/login" })
    return null
  }

  return (
    <div className="font-primary min-h-screen text-body">
      <div className="pt-24 pb-12 max-w-xl mx-auto px-4 flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Account Settings</h1>

        <Section title="Change Username">
          <ChangeUsername />
        </Section>

        <Section title="Change Password">
          <ChangePassword />
        </Section>

        <Section title="Change Region">
          <ChangeRegion />
        </Section>
      </div>
    </div>
  )
}
