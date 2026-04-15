import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { getReleaseYear } from "@/utils/helperFunctions";
import {
  queryFilmFromTMDB,
  fetchFilmFromTMDB,
  addFilmToCollection,
  removeFilmFromCollection,
  likeFilm,
  unlikeFilm,
  saveFilm,
  unsaveFilm,
} from "@/utils/apiCalls";
import useClickOutside from "@/hooks/useClickOutside";

import { BiSearchAlt2 } from "react-icons/bi";
import { CirclePlus, CheckCircle2, Loader } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { TMDBFilmSummary } from "@/types/tmdb";
import type { UserFilm, DirectorRef } from "@/types/film";
import type { CollectionData } from "@/hooks/useCollections";

const imgBaseUrl = "https://image.tmdb.org/t/p/original";

interface CollectionSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: CollectionData;
  onFilmAdded: (film: UserFilm) => void;
  onFilmRemoved: (filmId: number) => void;
  counterpartCollection?: CollectionData;
  onCounterpartFilmRemoved?: (filmId: number) => void;
}

export default function CollectionSearchModal({
  isOpen,
  onClose,
  collection,
  onFilmAdded,
  onFilmRemoved,
  counterpartCollection,
  onCounterpartFilmRemoved,
}: CollectionSearchModalProps) {
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<TMDBFilmSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [collectionFilmIds, setCollectionFilmIds] = useState<Set<number>>(
    new Set(collection.films.map((f) => f.id)),
  );
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [confirmPendingFilm, setConfirmPendingFilm] =
    useState<TMDBFilmSummary | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [displayedResults, setDisplayedResults] = useState<NodeListOf<Element>>(
    document.querySelectorAll(".no-results-placeholder"),
  );

  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleClickOutside = useCallback(() => {
    if (!confirmPendingFilm) onClose();
  }, [confirmPendingFilm, onClose]);

  const modalRef = useClickOutside(handleClickOutside);

  // Re-initialize collection film ids each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setCollectionFilmIds(new Set(collection.films.map((f) => f.id)));
      setSearchInput("");
      setSearchResults([]);
      setIsSearching(false);
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (resultsRef.current && searchInputRef.current) {
      if (focusedIndex === -1) {
        searchInputRef.current.focus();
      } else {
        const el = displayedResults[focusedIndex];
        if (el instanceof HTMLElement) el.focus();
      }
    }
  }, [focusedIndex, displayedResults]);

  useEffect(() => {
    if (resultsRef.current) {
      setDisplayedResults(
        resultsRef.current.querySelectorAll(".search-result"),
      );
    }
  }, [searchResults]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (focusedIndex === displayedResults.length - 1) {
          setFocusedIndex(-1);
        } else {
          setFocusedIndex((prev) => prev + 1);
        }
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (focusedIndex === -1) {
          setFocusedIndex(displayedResults.length - 1);
        } else {
          setFocusedIndex((prev) => prev - 1);
        }
      } else if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [displayedResults, focusedIndex, onClose]);

  useEffect(() => {
    if (!isOpen || searchInput.trim().length === 0) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await queryFilmFromTMDB(searchInput);
        setSearchResults(results);
      } catch (err) {
        console.error("CollectionSearchModal: search error", err);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [isOpen, searchInput]);

  const counterpartFilmIds = new Set(
    counterpartCollection?.films.map((f) => f.id) ?? [],
  );

  async function executeAdd(
    film: TMDBFilmSummary,
    removeFromCounterpart: boolean,
  ) {
    setPendingIds((prev) => new Set(prev).add(film.id));
    setCollectionFilmIds((prev) => new Set(prev).add(film.id));

    try {
      const fullFilm = await fetchFilmFromTMDB(film.id);
      const directors: DirectorRef[] = fullFilm.credits.crew
        .filter((c) => c.job === "Director")
        .map((c) => ({
          tmdbId: c.id,
          name: c.name,
          profile_path: c.profile_path,
        }));
      const directorNamesForSorting = directors.map((d) => d.name).join(", ");

      const filmBody = {
        tmdbId: fullFilm.id,
        title: fullFilm.title,
        runtime: fullFilm.runtime,
        directors,
        directorNamesForSorting,
        poster_path: fullFilm.poster_path,
        backdrop_path: fullFilm.backdrop_path,
        origin_country: fullFilm.origin_country,
        release_date: fullFilm.release_date,
        overview: fullFilm.overview,
        stars: 0,
      };

      if (collection.collectionType === "watched") {
        await likeFilm(filmBody);
      } else if (collection.collectionType === "watchlist") {
        await saveFilm(filmBody);
      } else {
        await addFilmToCollection(collection.id, filmBody);
      }

      const userFilm: UserFilm = {
        id: fullFilm.id,
        title: fullFilm.title,
        runtime: fullFilm.runtime,
        directors,
        directorNamesForSorting,
        poster_path: fullFilm.poster_path,
        backdrop_path: fullFilm.backdrop_path,
        origin_country: fullFilm.origin_country,
        release_date: fullFilm.release_date,
        added_date: new Date().toISOString(),
      };

      toast.success(`Added "${film.title}" to ${collection.title}`);
      onFilmAdded(userFilm);
      if (removeFromCounterpart) onCounterpartFilmRemoved?.(film.id);
    } catch (err: unknown) {
      // Rollback optimistic add
      setCollectionFilmIds((prev) => {
        const next = new Set(prev);
        next.delete(film.id);
        return next;
      });
      const isConflict =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        (err as { response?: { status?: number } }).response?.status === 409;
      toast.error(
        isConflict ? "Film is already in this collection" : "Action failed",
      );
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(film.id);
        return next;
      });
    }
  }

  function handleConfirmAdd() {
    if (!confirmPendingFilm) return;
    const film = confirmPendingFilm;
    setConfirmPendingFilm(null);
    void executeAdd(film, true);
  }

  async function handleToggleFilm(film: TMDBFilmSummary, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (pendingIds.has(film.id)) return;

    const isInCollection = collectionFilmIds.has(film.id);

    if (!isInCollection) {
      // Intercept add when film is in the counterpart system collection
      if (counterpartCollection && counterpartFilmIds.has(film.id)) {
        setConfirmPendingFilm(film);
        return;
      }
      await executeAdd(film, false);
      return;
    }

    // Remove — optimistic update
    setPendingIds((prev) => new Set(prev).add(film.id));
    setCollectionFilmIds((prev) => {
      const next = new Set(prev);
      next.delete(film.id);
      return next;
    });

    try {
      if (collection.collectionType === "watched") {
        await unlikeFilm(film.id);
      } else if (collection.collectionType === "watchlist") {
        await unsaveFilm(film.id);
      } else {
        await removeFilmFromCollection(collection.id, film.id);
      }
      toast.success(`Removed "${film.title}" from ${collection.title}`);
      onFilmRemoved(film.id);
    } catch (err: unknown) {
      // Rollback optimistic remove
      setCollectionFilmIds((prev) => new Set(prev).add(film.id));
      const isConflict =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        (err as { response?: { status?: number } }).response?.status === 409;
      toast.error(
        isConflict ? "Film is already in this collection" : "Action failed",
      );
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(film.id);
        return next;
      });
    }
  }

  function handleRowClick(film: TMDBFilmSummary) {
    onClose();
    navigate({ to: `/films/${film.id}` });
  }

  if (!isOpen) return null;

  return (
    <>
      <AlertDialog
        open={!!confirmPendingFilm}
        onOpenChange={(open) => {
          if (!open) setConfirmPendingFilm(null);
        }}
      >
        <AlertDialogContent style={{ zIndex: 601 }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Film Between Collections?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{confirmPendingFilm?.title}&rdquo; is currently in your{" "}
              <strong>{counterpartCollection?.title}</strong> collection. Adding
              it to <strong>{collection.title}</strong> will remove it from{" "}
              <strong>{counterpartCollection?.title}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAdd}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="font-primary fixed top-[20%] left-0 w-screen h-auto z-500 flex justify-center">
        <div
          className="relative w-[60%] h-auto min-w-[20rem] max-w-[32rem] bg-void/80 text-light backdrop-blur-sm border-1 border-dark/50 rounded-md"
          ref={modalRef as React.RefObject<HTMLDivElement>}
        >
          {/* Context banner */}
          <div className="p-3 lg:pt-4 lg:px-5 pb-0 lg:text-2xl text-light font-semibold">
            {collection.title}
          </div>

          {/* Search bar */}
          <div className="relative flex justify-start h-auto border-dark/50">
            <div className="relative w-full min-w-[10rem] h-[2.5rem] md:h-[3rem] xl:h-[3.5rem] p-2 flex items-center gap-3">
              <BiSearchAlt2 className="border-light ml-1 text-lg md:text-xl" />
              <input
                ref={searchInputRef}
                className="h-[4rem] w-full border-light focus:outline-0 input:bg-none text-base lg:text-lg"
                type="text"
                name="collection-search-bar"
                autoComplete="off"
                placeholder="Add or remove films from collection..."
                value={searchInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchInput(e.target.value)
                }
              />
              <button
                className="border-1 p-[3px] md:pb-1 md:pl-2 md:pr-2 rounded-md text-[12px] md:text-sm xl:text-base"
                onClick={onClose}
              >
                esc
              </button>
            </div>
          </div>

          {/* Results */}
          {isSearching && (
            <div
              className="w-full text-light p-2 max-h-[60vh] overflow-y-auto"
              ref={resultsRef}
            >
              {searchResults.length === 0 ? (
                <div className="m-2 ml-4">No results found.</div>
              ) : (
                <div className="flex flex-col justify-center gap-0">
                  {searchResults.slice(0, 8).map((film) => {
                    const inCollection = collectionFilmIds.has(film.id);
                    const isPending = pendingIds.has(film.id);
                    return (
                      <div
                        key={film.id}
                        className="search-result w-full h-[4rem] md:h-[5rem] flex justify-start items-center md:gap-1 gap-0 md:p-2 p-1 focus:bg-blue-600/80 hover:bg-light/20 focus:outline-0 rounded-md cursor-pointer"
                        tabIndex={0}
                        onClick={() => handleRowClick(film)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRowClick(film);
                        }}
                      >
                        <div className="group/thumbnail relative max-h-[5rem] max-w-[8rem] aspect-16/10 h-full flex-shrink-0">
                          <img
                            className="h-full w-auto object-cover transition-all duration-300 ease-out group-hover/thumbnail:scale-[1.03]"
                            src={
                              film.backdrop_path
                                ? `${imgBaseUrl}${film.backdrop_path}`
                                : "backdropnotfound.jpg"
                            }
                            alt=""
                          />
                        </div>
                        <div className="text-sm lg:text-base w-full p-3 min-w-0">
                          <span className="font-bold uppercase">
                            {film.title.slice(0, 20)}
                          </span>
                          {film.title.length >= 20 && (
                            <span className="font-bold uppercase text-lg">
                              ...
                            </span>
                          )}
                          {film.release_date && (
                            <>
                              <br />
                              <span>{getReleaseYear(film.release_date)}</span>
                            </>
                          )}
                        </div>
                        <button
                          className="flex-shrink-0 flex items-center justify-center w-[3rem] h-full hover:text-light/60 transition-colors duration-150"
                          aria-label={
                            inCollection
                              ? "Remove from collection"
                              : "Add to collection"
                          }
                          onClick={(e) => handleToggleFilm(film, e)}
                        >
                          {isPending ? (
                            <Loader className="size-[20px] animate-spin" />
                          ) : inCollection ? (
                            <CheckCircle2 className="size-[20px] text-green-400" />
                          ) : (
                            <CirclePlus className="size-[20px]" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
