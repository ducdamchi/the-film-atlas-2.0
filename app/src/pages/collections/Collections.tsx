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
import { getPresignedUrlFn, confirmCollectionCoverFn } from "@/server/uploads"
import { collectionsQueryOptions } from "@/queries/collections.queries"
import { useCollections } from "@/hooks/useCollections"
import type { AppCollection } from "@/types/api"

/* Components */
import SearchBar from "@/components/search/SearchBar"
import CollectionCarousel from "./components/CollectionCarousel"
import CollectionCover from "./components/CollectionCover"

import { VscNewCollection } from "react-icons/vsc"

export default function Collections() {
  const [searchInput, setSearchInput] = useState<string>("")
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null)
  const { authState } = useAuth()
  const queryClient = useQueryClient()
  const collections = useCollections()

  // Scroll a collection into view (after create or pin/unpin)
  useEffect(() => {
    if (!scrollTargetId) return
    requestAnimationFrame(() => {
      document
        .getElementById(scrollTargetId)
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
      setScrollTargetId(null)
    })
  }, [scrollTargetId])

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
        pinned_order: null,
        main_order: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Append to end of the unpinned section
      queryClient.setQueryData<AppCollection[]>(
        collectionsQueryOptions.queryKey,
        (old = []) => [...old, tempItem],
      )

      setScrollTargetId(newColParams.id)
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(
        collectionsQueryOptions.queryKey,
        context?.previous,
      )
      setScrollTargetId(null)
      toast.error("Failed to create collection")
    },
    onSuccess: (confirmed, vars) => {
      // Replace temp item with server-confirmed data
      queryClient.setQueryData<AppCollection[]>(
        collectionsQueryOptions.queryKey,
        (old = []) => old.map((c) => (c.id === vars.id ? confirmed : c)),
      )
      toast.success("Collection created")
    },
  })
  function handleCreateCollection() {
    const tempId = crypto.randomUUID()
    const n = collections.length + 1
    const title = `My Collection #${n}`
    const description = `This is a place holder description for My Collection #${n}`
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
          // Sort: pinned first (by pinned_order), then unpinned (by main_order)
          const pinned_ = updated.filter((c) => c.is_pinned)
          const unpinned = updated.filter((c) => !c.is_pinned)
          pinned_.sort((a, b) =>
            (a.pinned_order ?? "").localeCompare(b.pinned_order ?? ""),
          )
          unpinned.sort((a, b) =>
            (a.main_order ?? "").localeCompare(b.main_order ?? ""),
          )
          return [...pinned_, ...unpinned]
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
    onSuccess: (confirmed, vars) => {
      // Patch cache with server-confirmed order values and re-sort
      queryClient.setQueryData<AppCollection[]>(
        collectionsQueryOptions.queryKey,
        (old = []) => {
          const updated = old.map((c) =>
            c.id === vars.id
              ? {
                  ...c,
                  is_pinned: confirmed.is_pinned,
                  pinned_order: confirmed.pinned_order,
                  main_order: confirmed.main_order,
                }
              : c,
          )
          const pinned_ = updated.filter((c) => c.is_pinned)
          const unpinned = updated.filter((c) => !c.is_pinned)
          pinned_.sort((a, b) =>
            (a.pinned_order ?? "").localeCompare(b.pinned_order ?? ""),
          )
          unpinned.sort((a, b) =>
            (a.main_order ?? "").localeCompare(b.main_order ?? ""),
          )
          return [...pinned_, ...unpinned]
        },
      )
      setScrollTargetId(vars.id)
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

  /* ── Cover Upload ──────────────────────────────────────────────────────── */
  async function handleUpdateCover(
    collectionId: string,
    file: File,
  ): Promise<void> {
    const { uploadUrl, publicUrl } = await getPresignedUrlFn({
      data: {
        type: "collection-cover",
        contentType: file.type,
        collectionId,
      },
    })

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    })
    if (!uploadRes.ok) throw new Error("Upload failed")

    await confirmCollectionCoverFn({ data: { collectionId, publicUrl } })

    queryClient.setQueryData<AppCollection[]>(
      collectionsQueryOptions.queryKey,
      (old = []) =>
        old.map((c) =>
          c.id === collectionId ? { ...c, cover_photo: publicUrl } : c,
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

  /* ── Render ───────────────────────────────────────────────────────────── */
  const isAuthenticated = !!authState.status
  const watchedCollection = collections.find(
    (c) => c.collectionType === "watched",
  )
  const watchlistCollection = collections.find(
    (c) => c.collectionType === "watchlist",
  )

  return (
    <div className="font-primary min-h-screen mb-40 inset-0 bg-background">
      <div className="@container flex flex-col items-center w-full">
        <div className="font-heading page-title">COLLECTIONS</div>
        <SearchBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          placeholderString="Search your collections ..."
        />

        {isAuthenticated && (
          <div className="my-10">
            <button
              onClick={handleCreateCollection}
              className="flex items-center gap-2 rounded-sm p-3 bg-foreground text-muted hover:bg-foreground/80 transition-all ease-out duration-200">
              <VscNewCollection className="text-[24px]" />
              <span>New Collection</span>
            </button>
          </div>
        )}

        <section className="w-full flex flex-col items-center gap-0">
          {collections.map((col) => {
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
                className={`w-full flex flex-col items-center py-6 relative ${col.coverPhoto ? "text-white" : ""}`}>
                {col.coverPhoto && <CollectionCover src={col.coverPhoto} />}
                <CollectionCarousel
                  collection={col}
                  counterpartCollection={counterpart}
                  onDelete={isAuthenticated ? handleDelete : undefined}
                  onTogglePin={isAuthenticated ? handleTogglePin : undefined}
                  onToggleVisibility={
                    isAuthenticated ? handleToggleVisibility : undefined
                  }
                  onRename={isAuthenticated ? handleRename : undefined}
                  onUpdateDescription={
                    isAuthenticated ? handleUpdateDescription : undefined
                  }
                  onUpdateCover={
                    isAuthenticated ? handleUpdateCover : undefined
                  }
                />
              </div>
            )
          })}
        </section>
      </div>
    </div>
  )
}
