import { createFileRoute } from "@tanstack/react-router"
import {
  collectionsQueryOptions,
  collectionDetailQueryOptions,
  watchedFilmsQueryOptions,
  watchlistedFilmsQueryOptions,
} from "@/queries/collections.queries"
import Collections from "../components/Collections"
import LoadingPage from "../components/layout/LoadingPage"
import type { AppCollection } from "@/types/api"

export const Route = createFileRoute("/collections")({
  loader: async ({ context: { queryClient, auth } }) => {
    if (!auth) return
    const collections = (await queryClient.ensureQueryData(
      collectionsQueryOptions,
    )) as AppCollection[]
    await Promise.all([
      queryClient.prefetchQuery(watchedFilmsQueryOptions),
      queryClient.prefetchQuery(watchlistedFilmsQueryOptions),
      ...collections
        .filter((c) => c.collection_type === "standard")
        .map((c) => queryClient.prefetchQuery(collectionDetailQueryOptions(c.id))),
    ])
  },
  pendingComponent: () => <LoadingPage variant="loading" />,
  component: Collections,
})
