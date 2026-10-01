import { createServerFn } from "@tanstack/react-start"
import { apiHeaders } from "./utils"

const API_URL = process.env.API_URL ?? "http://localhost:3002"

export const getPresignedUrlFn = createServerFn({ method: "POST" })
  .inputValidator((data: { type: "avatar" | "collection-cover"; contentType: string; collectionId?: string }) => data)
  .handler(async ({ data }): Promise<{ uploadUrl: string; objectKey: string; publicUrl: string }> => {
    const res = await fetch(`${API_URL}/uploads/presigned-url`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to get upload URL" }))
      throw new Error(err.error)
    }
    return res.json()
  })

export const confirmAvatarFn = createServerFn({ method: "POST" })
  .inputValidator((data: { publicUrl: string }) => data)
  .handler(async ({ data }): Promise<{ image: string }> => {
    const res = await fetch(`${API_URL}/uploads/confirm-avatar`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to confirm avatar" }))
      throw new Error(err.error)
    }
    return res.json()
  })

export const confirmCollectionCoverFn = createServerFn({ method: "POST" })
  .inputValidator((data: { collectionId: string; publicUrl: string }) => data)
  .handler(async ({ data }): Promise<{ cover_photo: string }> => {
    const res = await fetch(`${API_URL}/uploads/confirm-collection-cover`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to confirm cover" }))
      throw new Error(err.error)
    }
    return res.json()
  })

export const deleteAvatarFn = createServerFn({ method: "POST" })
  .handler(async (): Promise<{ image: null }> => {
    const res = await fetch(`${API_URL}/uploads/avatar`, {
      method: "DELETE",
      headers: apiHeaders(),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to remove avatar" }))
      throw new Error(err.error)
    }
    return res.json()
  })
