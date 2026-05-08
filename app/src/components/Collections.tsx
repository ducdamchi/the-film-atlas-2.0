/* Libraries */
import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

/* Custom functions */
import { useAuth } from "@/utils/authContext"
import {
  createCollectionFn,
  patchCollectionPinFn,
  patchCollectionVisibilityFn,
  putCollectionTitleFn,
  putCollectionDescriptionFn,
} from "@/server/collections"
import {
  collectionsQueryOptions,
  collectionDetailQueryOptions,
  watchedFilmsQueryOptions,
  watchlistedFilmsQueryOptions,
} from "@/queries/collections.queries"
import { useCollections } from "@/hooks/useCollections"
import type { AppCollection } from "@/types/api"
import type { UserFilm } from "@/types/film"

/* Components */
import SearchBar from "./search/SearchBar"
import CollectionCarousel from "./collections/CollectionCarousel"

import { VscNewCollection } from "react-icons/vsc"

export default function Collections() {
  const [searchInput, setSearchInput] = useState<string>("")
  const [newCollectionId, setNewCollectionId] = useState<string | null>(null)
  const { authState } = useAuth()
  const queryClient = useQueryClient()
  const collections = useCollections()

  // Scroll new collection into view after optimistic insert
  useEffect(() => {
    if (!newCollectionId) return
    requestAnimationFrame(() => {
      document
        .getElementById(newCollectionId)
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }, [newCollectionId])

  /* ── Create ─────────────────────────────────────────────────────────── */

  const createMutation = useMutation({
    mutationFn: (params: { id: string; title: string; description: string }) =>
      createCollectionFn({ data: params }),
    onMutate: async (newColParams) => {
      await queryClient.cancelQueries({ queryKey: ["collections"] })
      const previous = queryClient.getQueryData<AppCollection[]>(
        collectionsQueryOptions.queryKey,
      )

      const tempItem: AppCollection = {
        id: newColParams.id,
        title: newColParams.title,
        description: newColParams.description,
        cover_photo: null,
        is_public: false,
        collection_type: "standard",
        film_count: 0,
        total_runtime: 0,
        is_pinned: false,
        display_position: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      queryClient.setQueryData<AppCollection[]>(
        collectionsQueryOptions.queryKey,
        (old = []) => {
          const insertAt = old.findIndex((c) => !c.is_pinned)
          if (insertAt === -1) return [...old, tempItem]
          return [...old.slice(0, insertAt), tempItem, ...old.slice(insertAt)]
        },
      )

      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(
        collectionsQueryOptions.queryKey,
        context?.previous,
      )
      setNewCollectionId(null)
      toast.error("Failed to create collection")
    },
    onSuccess: (confirmed, vars) => {
      // Replace temp item with server-confirmed data
      queryClient.setQueryData<AppCollection[]>(
        collectionsQueryOptions.queryKey,
        (old = []) => old.map((c) => (c.id === vars.id ? confirmed : c)),
      )
      setNewCollectionId(null)
    },
  })

  function handleCreateCollection() {
    const tempId = crypto.randomUUID()
    const n = collections.length + 1
    const title = `My Collection #${n}`
    const description = `This is a place holder description for My Collection #${n}`
    setNewCollectionId(tempId)
    createMutation.mutate({ id: tempId, title, description })
  }

  /* ── Pin ─────────────────────────────────────────────────────────────── */

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      patchCollectionPinFn({ data: { id, pinned } }),
    onMutate: async ({ id, pinned }) => {
      await queryClient.cancelQueries({ queryKey: ["collections"] })
      const previous = queryClient.getQueryData<AppCollection[]>(
        collectionsQueryOptions.queryKey,
      )
      queryClient.setQueryData<AppCollection[]>(
        collectionsQueryOptions.queryKey,
        (old = []) => {
          const updated = old.map((c) =>
            c.id === id ? { ...c, is_pinned: pinned } : c,
          )
          return [
            ...updated.filter((c) => c.is_pinned),
            ...updated.filter((c) => !c.is_pinned),
          ]
        },
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(
        collectionsQueryOptions.queryKey,
        context?.previous,
      )
    },
  })

  function handleTogglePin(id: string): Promise<void> {
    const col = collections.find((c) => c.id === id)
    if (!col) return Promise.resolve()
    const next = !col.isPinned
    return new Promise((resolve, reject) => {
      pinMutation.mutate(
        { id, pinned: next },
        { onSuccess: () => resolve(), onError: reject },
      )
    })
  }

  /* ── Rename ──────────────────────────────────────────────────────────── */

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      putCollectionTitleFn({ data: { id, title } }),
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: ["collections"] })
      const previous = queryClient.getQueryData<AppCollection[]>(
        collectionsQueryOptions.queryKey,
      )
      queryClient.setQueryData<AppCollection[]>(
        collectionsQueryOptions.queryKey,
        (old = []) => old.map((c) => (c.id === id ? { ...c, title } : c)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(
        collectionsQueryOptions.queryKey,
        context?.previous,
      )
    },
    onSuccess: (confirmed, vars) => {
      queryClient.setQueryData<AppCollection[]>(
        collectionsQueryOptions.queryKey,
        (old = []) =>
          old.map((c) =>
            c.id === vars.id ? { ...c, title: confirmed.title } : c,
          ),
      )
    },
  })

  function handleRename(id: string, newTitle: string): Promise<void> {
    return new Promise((resolve, reject) => {
      renameMutation.mutate(
        { id, title: newTitle },
        { onSuccess: () => resolve(), onError: reject },
      )
    })
  }

  /* ── Description ─────────────────────────────────────────────────────── */

  const descriptionMutation = useMutation({
    mutationFn: ({ id, description }: { id: string; description: string }) =>
      putCollectionDescriptionFn({ data: { id, description } }),
    onMutate: async ({ id, description }) => {
      await queryClient.cancelQueries({ queryKey: ["collections"] })
      const previous = queryClient.getQueryData<AppCollection[]>(
        collectionsQueryOptions.queryKey,
      )
      queryClient.setQueryData<AppCollection[]>(
        collectionsQueryOptions.queryKey,
        (old = []) => old.map((c) => (c.id === id ? { ...c, description } : c)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(
        collectionsQueryOptions.queryKey,
        context?.previous,
      )
    },
    onSuccess: (confirmed, vars) => {
      queryClient.setQueryData<AppCollection[]>(
        collectionsQueryOptions.queryKey,
        (old = []) =>
          old.map((c) =>
            c.id === vars.id
              ? { ...c, description: confirmed.description ?? "" }
              : c,
          ),
      )
    },
  })

  function handleUpdateDescription(
    id: string,
    newDescription: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      descriptionMutation.mutate(
        { id, description: newDescription },
        { onSuccess: () => resolve(), onError: reject },
      )
    })
  }

  /* ── Visibility ──────────────────────────────────────────────────────── */

  const visibilityMutation = useMutation({
    mutationFn: ({ id, is_public }: { id: string; is_public: boolean }) =>
      patchCollectionVisibilityFn({ data: { id, is_public } }),
    onMutate: async ({ id, is_public }) => {
      await queryClient.cancelQueries({ queryKey: ["collections"] })
      const previous = queryClient.getQueryData<AppCollection[]>(
        collectionsQueryOptions.queryKey,
      )
      queryClient.setQueryData<AppCollection[]>(
        collectionsQueryOptions.queryKey,
        (old = []) => old.map((c) => (c.id === id ? { ...c, is_public } : c)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(
        collectionsQueryOptions.queryKey,
        context?.previous,
      )
    },
  })

  function handleToggleVisibility(id: string): Promise<void> {
    const col = collections.find((c) => c.id === id)
    if (!col) return Promise.resolve()
    const next = !col.isPublic
    return new Promise((resolve, reject) => {
      visibilityMutation.mutate(
        { id, is_public: next },
        { onSuccess: () => resolve(), onError: reject },
      )
    })
  }

  /* ── Add / Remove films (API call happens in child, we just sync cache) ── */

  function handleAddFilmToCollection(collectionId: string, film: UserFilm) {
    const col = collections.find((c) => c.id === collectionId)
    if (col?.collectionType === "watched") {
      queryClient.setQueryData<UserFilm[]>(
        watchedFilmsQueryOptions.queryKey,
        (old = []) => [film, ...old],
      )
    } else if (col?.collectionType === "watchlist") {
      queryClient.setQueryData<UserFilm[]>(
        watchlistedFilmsQueryOptions.queryKey,
        (old = []) => [film, ...old],
      )
    } else {
      queryClient.setQueryData<{
        collection: AppCollection
        films: UserFilm[]
      }>(collectionDetailQueryOptions(collectionId).queryKey, (old) =>
        old ? { ...old, films: [film, ...old.films] } : old,
      )
    }
    // Update main list film_count + total_runtime (triggers useCollections re-render)
    queryClient.setQueryData<AppCollection[]>(
      collectionsQueryOptions.queryKey,
      (old = []) =>
        old.map((c) =>
          c.id === collectionId
            ? {
                ...c,
                film_count: c.film_count + 1,
                total_runtime: c.total_runtime + (film.runtime ?? 0),
              }
            : c,
        ),
    )
  }

  function handleRemoveFilmFromCollection(
    collectionId: string,
    filmId: number,
  ) {
    const col = collections.find((c) => c.id === collectionId)
    let removedRuntime = 0

    if (col?.collectionType === "watched") {
      const films =
        queryClient.getQueryData<UserFilm[]>(
          watchedFilmsQueryOptions.queryKey,
        ) ?? []
      removedRuntime = films.find((f) => f.id === filmId)?.runtime ?? 0
      queryClient.setQueryData<UserFilm[]>(
        watchedFilmsQueryOptions.queryKey,
        (old = []) => old.filter((f) => f.id !== filmId),
      )
    } else if (col?.collectionType === "watchlist") {
      const films =
        queryClient.getQueryData<UserFilm[]>(
          watchlistedFilmsQueryOptions.queryKey,
        ) ?? []
      removedRuntime = films.find((f) => f.id === filmId)?.runtime ?? 0
      queryClient.setQueryData<UserFilm[]>(
        watchlistedFilmsQueryOptions.queryKey,
        (old = []) => old.filter((f) => f.id !== filmId),
      )
    } else {
      const cached = queryClient.getQueryData<{
        collection: AppCollection
        films: UserFilm[]
      }>(collectionDetailQueryOptions(collectionId).queryKey)
      removedRuntime = cached?.films.find((f) => f.id === filmId)?.runtime ?? 0
      queryClient.setQueryData<{
        collection: AppCollection
        films: UserFilm[]
      }>(collectionDetailQueryOptions(collectionId).queryKey, (old) =>
        old ? { ...old, films: old.films.filter((f) => f.id !== filmId) } : old,
      )
    }

    queryClient.setQueryData<AppCollection[]>(
      collectionsQueryOptions.queryKey,
      (old = []) =>
        old.map((c) =>
          c.id === collectionId
            ? {
                ...c,
                film_count: Math.max(0, c.film_count - 1),
                total_runtime: c.total_runtime - removedRuntime,
              }
            : c,
        ),
    )
  }

  /* ── Delete (API call happens in child, we just remove from cache) ────── */

  function handleDelete(deletedId: string) {
    queryClient.setQueryData<AppCollection[]>(
      collectionsQueryOptions.queryKey,
      (old = []) => old.filter((c) => c.id !== deletedId),
    )
  }

  return (
    <div className="font-primary min-h-screen w-screen mb-40 absolute inset-0">
      <div className="@container flex flex-col items-center w-full">
        <div className="font-heading page-title">COLLECTIONS</div>
        <SearchBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          placeholderString="Search your collections ..."
        />

        {!authState.status ? (
          <div className="mt-10 mb-20 text-sm md:text-base">
            Log in to use collections!
          </div>
        ) : (
          <>
            <div className="my-10">
              <button
                onClick={handleCreateCollection}
                className="flex items-center gap-2 border-1 rounded-sm p-3 border-muted/40 bg-muted/40 hover:bg-muted transition-all ease-out duration-200">
                <VscNewCollection className="text-[24px]" />
                <span>New Collection</span>
              </button>
            </div>
            <section className="w-full mt-8 flex flex-col items-center gap-10">
              {(() => {
                const watchedCollection = collections.find(
                  (c) => c.collectionType === "watched",
                )
                const watchlistCollection = collections.find(
                  (c) => c.collectionType === "watchlist",
                )
                return collections.map((col) => {
                  const counterpart =
                    col.collectionType === "watched"
                      ? watchlistCollection
                      : col.collectionType === "watchlist"
                        ? watchedCollection
                        : undefined
                  return (
                    <div
                      key={col.id}
                      id={col.id}
                      className="w-full flex flex-col items-center">
                      <CollectionCarousel
                        collection={col}
                        onDelete={handleDelete}
                        onTogglePin={handleTogglePin}
                        onToggleVisibility={handleToggleVisibility}
                        onRename={handleRename}
                        onUpdateDescription={handleUpdateDescription}
                        onFilmAdded={handleAddFilmToCollection}
                        onFilmRemoved={handleRemoveFilmFromCollection}
                        counterpartCollection={counterpart}
                        onCounterpartFilmRemoved={
                          counterpart
                            ? (filmId) =>
                                handleRemoveFilmFromCollection(
                                  counterpart.id,
                                  filmId,
                                )
                            : undefined
                        }
                      />
                    </div>
                  )
                })
              })()}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
