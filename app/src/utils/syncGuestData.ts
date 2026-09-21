import { syncGuestDataFn } from "@/server/watched"
import { getGuestData, clearGuestData } from "@/utils/guestStore"
import type { QueryClient } from "@tanstack/react-query"

/**
 * After login or signup, check for guest interaction data in localStorage.
 * If present, sync it to the database and clear the local store.
 */
export async function syncGuestDataIfPresent(
  queryClient: QueryClient,
): Promise<void> {
  const guestData = getGuestData()
  if (guestData.watched.length === 0 && guestData.watchlisted.length === 0) {
    return
  }

  try {
    await syncGuestDataFn({ data: guestData })
    clearGuestData()

    // Clear guest query cache and refresh authenticated data
    queryClient.removeQueries({ queryKey: ["guest-watched"] })
    queryClient.removeQueries({ queryKey: ["guest-watchlisted"] })
    queryClient.invalidateQueries({ queryKey: ["watched-list"] })
    queryClient.invalidateQueries({ queryKey: ["watchlisted-list"] })
    queryClient.invalidateQueries({ queryKey: ["collections"] })
    queryClient.invalidateQueries({ queryKey: ["directors"] })
  } catch (err) {
    console.error("Guest data sync failed:", err)
    // Don't clear — user can retry on next page load
  }
}
