import { useState, useEffect, useRef } from "react"
import PageTitle from "@/components/ui-custom/PageTitle"
import { useAuth } from "@/utils/authContext"
import { useNavigate } from "@tanstack/react-router"
import { LocationPicker } from "./components/LocationPicker"
import { authClient, clearAuthToken } from "@/lib/authClient"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "#/components/ui-shadcn/avatar"
import { getInitials } from "@/lib/utils"
import {
  getPresignedUrlFn,
  confirmAvatarFn,
  deleteAvatarFn,
} from "@/server/uploads"

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border-foreground border-1 bg-white rounded-none p-6">
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
          className={`auth-formField border-foreground border-r-0 w-full transition-opacity ${!isEditing ? "cursor-not-allowed text-foreground/80" : ""}`}
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
            className="flex items-center justify-center min-w-[4rem] px-3 bg-destructive text-background text-sm hover:bg-destructive/90 transition-colors cursor-pointer">
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={handleEdit}
            className="flex items-center bg-foreground text-background justify-center min-w-[4rem] px-3 text-sm hover:bg-foreground/90 transition-colors cursor-pointer">
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

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

function ChangeAvatar() {
  const { authState } = useAuth()
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentImage = authState.image

  // Clear blob preview once the session updates with the real URL
  useEffect(() => {
    if (currentImage && preview) setPreview(null)
  }, [currentImage])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSuccess("")
    setError("")

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("File must be JPEG, PNG, WebP, or GIF.")
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("File must be under 5 MB.")
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    handleUpload(file)
  }

  const handleUpload = async (file: File) => {
    setLoading(true)
    try {
      // 1. Get presigned PUT URL from API
      const { uploadUrl, publicUrl } = await getPresignedUrlFn({
        data: { type: "avatar", contentType: file.type },
      })

      // 2. PUT file directly to R2
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!uploadRes.ok) throw new Error("Upload failed")

      // 3. Save public URL in database
      await confirmAvatarFn({ data: { publicUrl } })

      // 4. Update Better Auth session so useSession() picks up the new image
      await authClient.updateUser({ image: publicUrl } as any)
      setSuccess("Avatar updated.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error uploading avatar.")
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleRemove = async () => {
    setSuccess("")
    setError("")
    setLoading(true)
    try {
      await deleteAvatarFn()
      await authClient.updateUser({ image: null } as any)
      setSuccess("Avatar removed.")
    } catch {
      setError("Error removing avatar.")
    } finally {
      setLoading(false)
    }
  }

  const displayImage = preview ?? currentImage

  return (
    <div className="flex flex-col gap-3">
      <div className="min-w-[6rem] max-w-[6rem] sm:min-w-[12rem] sm:max-w-[12rem] aspect-square rounded-full bg-foreground/10 border border-foreground flex items-center justify-center overflow-hidden">
        <Avatar className="w-full h-full">
          {displayImage && <AvatarImage src={displayImage} alt="Avatar" />}
          <AvatarFallback className="rounded-lg text-3xl">
            {getInitials(authState.username)}
          </AvatarFallback>
        </Avatar>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelect}
      />
      <StatusMessage success={success} error={error} />
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="accountSettings-formSubmitButton disabled:cursor-not-allowed">
          {loading ? "Uploading..." : "Upload new photo"}
        </button>
        <button
          type="button"
          onClick={handleRemove}
          disabled={loading || !currentImage}
          className="accountSettings-formSubmitButton disabled:cursor-not-allowed">
          {loading ? "Removing..." : "Remove current photo"}
        </button>
      </div>
    </div>
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
        className="auth-formField border-foreground"
        type="password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        placeholder="Current password *"
      />
      <input
        className="auth-formField border-foreground"
        type="password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        placeholder="New password *"
        minLength={8}
      />
      <input
        className="auth-formField border-foreground"
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

function DeleteAccount() {
  const navigate = useNavigate()
  const [confirmText, setConfirmText] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (confirmText !== "DELETE") return
    setError("")
    setLoading(true)
    try {
      const { error: deleteError } = await authClient.deleteUser()
      if (deleteError) {
        setError(deleteError.message)
        return
      }
      clearAuthToken()
      navigate({ to: "/" })
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleDelete} className="flex flex-col gap-3">
      <p className="text-sm text-subtle">
        This action is permanent and cannot be undone. All your data — watched
        films, watchlist, collections, ratings, and account information — will
        be permanently deleted.
      </p>
      <p className="text-sm text-subtle">
        Type <span className="font-bold text-error">DELETE</span> to confirm.
      </p>
      <input
        className="auth-formField border-destructive w-[18rem]"
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder='Type "DELETE" to confirm'
      />
      {error && <p className="text-error text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading || confirmText !== "DELETE"}
        className="accountSettings-formSubmitButton bg-destructive text-white hover:bg-destructive/80 disabled:cursor-not-allowed">
        {loading ? "Deleting..." : "Delete my account"}
      </button>
    </form>
  )
}

export function AccountSettings() {
  const { authState } = useAuth()
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)

  useEffect(() => {
    if (!authState.status) return
    authClient.listAccounts().then(({ data }) => {
      const hasCredential = data?.some((a: any) => a.provider === "credential")
      setHasPassword(!!hasCredential)
    })
  }, [authState.status])

  if (!authState.status) return null

  return (
    <div className="@container font-primary min-h-screen text-body bg-background">
      <PageTitle title="Account Settings" />

      <div className="pt-10 pb-12 max-w-xl mx-auto px-4 flex flex-col gap-6">
        <Section title="Change Username">
          <ChangeUsername />
        </Section>

        <Section title="Change Avatar">
          <ChangeAvatar />
        </Section>

        {hasPassword && (
          <Section title="Change Password">
            <ChangePassword />
          </Section>
        )}

        <Section title="Change Region">
          <ChangeRegion />
        </Section>

        <Section title="Delete Account">
          <DeleteAccount />
        </Section>
      </div>
    </div>
  )
}
