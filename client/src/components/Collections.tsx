/* Libraries */
import { useState, useEffect } from "react";

/* Custom functions */
import { useAuth } from "@/utils/authContext";
import { createCollection, patchCollectionPin, patchCollectionVisibility, putCollectionTitle, putCollectionDescription } from "@/utils/apiCalls";
import { useCollections } from "@/hooks/useCollections";
import type { UserFilm } from "@/types/film";

/* Components */
import SearchBar from "./layout/SearchBar";
import CollectionCarousel from "./collections/CollectionCarousel";
import LoadingPage from "./layout/LoadingPage";

import { VscNewCollection } from "react-icons/vsc";

export default function Collections() {
  const [searchInput, setSearchInput] = useState<string>("");
  const [newCollectionId, setNewCollectionId] = useState<string | null>(null);
  const { authState } = useAuth();
  const { collections, setCollections, isLoading } = useCollections();

  useEffect(() => {
    if (!newCollectionId) return;
    requestAnimationFrame(() => {
      document.getElementById(newCollectionId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [newCollectionId]);

  // Optimistically adds a new collection with a temp ID, then replaces it with the
  // server-confirmed data on success or removes it on failure.
  function handleCreateCollection() {
    const tempId = crypto.randomUUID();
    const n = collections.length + 1;
    const title = `My Collection #${n}`;
    const description = `This is a place holder description for My Collection #${n}`;

    const newItem = {
      id: tempId,
      title,
      description,
      collectionType: "standard",
      queryString: tempId,
      isPublic: false,
      filmCount: 0,
      totalRuntime: 0,
      isPinned: false,
      films: [],
    };

    setCollections((prev) => {
      const insertAt = prev.findIndex((c) => !c.isPinned);
      if (insertAt === -1) return [...prev, newItem];
      return [...prev.slice(0, insertAt), newItem, ...prev.slice(insertAt)];
    });
    setNewCollectionId(tempId);

    createCollection({ id: tempId, title, description })
      .then((confirmed) => {
        setNewCollectionId(null);
        setCollections((prev) =>
          prev.map((c) =>
            c.id === tempId
              ? {
                  id: confirmed.id,
                  title: confirmed.title,
                  description: confirmed.description ?? null,
                  collectionType: confirmed.collection_type,
                  queryString: confirmed.id,
                  isPublic: confirmed.is_public,
                  filmCount: confirmed.film_count,
                  totalRuntime: confirmed.total_runtime,
                  isPinned: confirmed.is_pinned,
                  films: [],
                }
              : c,
          ),
        );
      })
      .catch(() => {
        setNewCollectionId(null);
        setCollections((prev) => prev.filter((c) => c.id !== tempId));
      });
  }

  function handleTogglePin(id: string): Promise<void> {
    const col = collections.find((c) => c.id === id);
    if (!col) return Promise.resolve();
    const next = !col.isPinned;
    setCollections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isPinned: next } : c)),
    );
    return patchCollectionPin(id, next)
      .then(() => {})
      .catch(() => {
        setCollections((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isPinned: !next } : c)),
        );
        throw new Error();
      });
  }

  function handleRename(id: string, newTitle: string): Promise<void> {
    const originalTitle = collections.find((c) => c.id === id)?.title ?? newTitle;
    setCollections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c)),
    );
    return putCollectionTitle(id, newTitle)
      .then((confirmed) => {
        setCollections((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: confirmed.title } : c)),
        );
      })
      .catch(() => {
        setCollections((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: originalTitle } : c)),
        );
        throw new Error();
      });
  }

  function handleUpdateDescription(id: string, newDescription: string): Promise<void> {
    const originalDescription = collections.find((c) => c.id === id)?.description ?? null;
    setCollections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, description: newDescription } : c)),
    );
    return putCollectionDescription(id, newDescription)
      .then((confirmed) => {
        setCollections((prev) =>
          prev.map((c) => (c.id === id ? { ...c, description: confirmed.description ?? null } : c)),
        );
      })
      .catch(() => {
        setCollections((prev) =>
          prev.map((c) => (c.id === id ? { ...c, description: originalDescription } : c)),
        );
        throw new Error();
      });
  }

  function handleAddFilmToCollection(collectionId: string, film: UserFilm) {
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId
          ? { ...c, films: [film, ...c.films], filmCount: c.filmCount + 1, totalRuntime: c.totalRuntime + (film.runtime ?? 0) }
          : c,
      ),
    );
  }

  function handleRemoveFilmFromCollection(collectionId: string, filmId: number) {
    setCollections((prev) =>
      prev.map((c) => {
        if (c.id !== collectionId) return c;
        const removed = c.films.find((f) => f.id === filmId);
        return {
          ...c,
          films: c.films.filter((f) => f.id !== filmId),
          filmCount: c.filmCount - 1,
          totalRuntime: c.totalRuntime - (removed?.runtime ?? 0),
        };
      }),
    );
  }

  function handleToggleVisibility(id: string): Promise<void> {
    const col = collections.find((c) => c.id === id);
    if (!col) return Promise.resolve();
    const next = !col.isPublic;
    setCollections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isPublic: next } : c)),
    );
    return patchCollectionVisibility(id, next)
      .then(() => {})
      .catch(() => {
        setCollections((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isPublic: !next } : c)),
        );
        throw new Error();
      });
  }

  if (isLoading) return <LoadingPage variant="authenticating" />;

  return (
    <div className="font-primary mt-20 min-h-screen w-screen mb-40">
      <div className="flex flex-col items-center w-full">
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
                className="flex items-center gap-2 border-1 rounded-sm p-3 border-muted-light/40 bg-control/40 hover:bg-control transition-all ease-out duration-200"
              >
                <VscNewCollection className="text-[24px]" />
                <span>New Collection</span>
              </button>
            </div>
            <section className="@container w-full mt-8 flex flex-col items-center gap-10">
              {(() => {
                const watchedCollection = collections.find((c) => c.collectionType === "watched");
                const watchlistCollection = collections.find((c) => c.collectionType === "watchlist");
                return collections.map((col) => {
                  const counterpart =
                    col.collectionType === "watched" ? watchlistCollection :
                    col.collectionType === "watchlist" ? watchedCollection :
                    undefined;
                  return (
                    <div key={col.id} id={col.id} className="w-full flex flex-col items-center">
                      <CollectionCarousel
                        collection={col}
                        onDelete={(deletedId) =>
                          setCollections((prev) =>
                            prev.filter((c) => c.id !== deletedId),
                          )
                        }
                        onTogglePin={handleTogglePin}
                        onToggleVisibility={handleToggleVisibility}
                        onRename={handleRename}
                        onUpdateDescription={handleUpdateDescription}
                        onFilmAdded={handleAddFilmToCollection}
                        onFilmRemoved={handleRemoveFilmFromCollection}
                        counterpartCollection={counterpart}
                        onCounterpartFilmRemoved={
                          counterpart
                            ? (filmId) => handleRemoveFilmFromCollection(counterpart.id, filmId)
                            : undefined
                        }
                      />
                    </div>
                  );
                });
              })()}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
