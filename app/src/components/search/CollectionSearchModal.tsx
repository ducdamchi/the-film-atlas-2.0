import { useCallback, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { getReleaseYear } from "@/utils/helperFunctions";
import {
  queryFilmFromTMDBPaged,
  fetchFilmFromTMDB,
  addFilmToCollection,
  removeFilmFromCollection,
  likeFilm,
  unlikeFilm,
  saveFilm,
  unsaveFilm,
} from "@/utils/apiCalls";
import useClickOutside from "@/hooks/useClickOutside";
import { useModalKeyboardNav } from "@/hooks/useModalKeyboardNav";
import { usePagedSearch } from "@/hooks/usePagedSearch";
import SearchModalShell from "@/components/search/SearchModalShell";

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
} from "@/components/ui-shadcn/alert-dialog";

import type { TMDBFilmSummary } from "@/types/tmdb";
import type { UserFilm, DirectorRef, StarRating } from "@/types/film";
import type { CollectionData } from "@/hooks/useCollections";

const imgBaseUrl = "https://image.tmdb.org/t/p/original";

// ---------------------------------------------------------------------------
// Result section types — architecture slot for future predicted-query results.
// Today only "standard" sections are produced; "suggested" sections will be
// prepended by an edge function once that layer exists.
// ---------------------------------------------------------------------------

type FilmResultSection =
  | { kind: "suggested"; label: string; films: TMDBFilmSummary[] }
  | { kind: "standard"; films: TMDBFilmSummary[] };

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

/**
 * Sorts TMDB search results so the most relevant films appear first:
 *   Tier 0 — already in this collection
 *   Tier 1 — in another known collection (counterpart or allUserFilmIds)
 *   Tier 2 — has a backdrop thumbnail, sorted by popularity desc
 *   Tier 3 — no backdrop thumbnail (pushed to the end)
 */
function rankFilmResults(
  films: TMDBFilmSummary[],
  collectionFilmIds: Set<number>,
  knownFilmIds: Set<number>,
): TMDBFilmSummary[] {
  return [...films].sort((a, b) => {
    const tier = (f: TMDBFilmSummary): number => {
      if (collectionFilmIds.has(f.id)) return 0;
      if (knownFilmIds.has(f.id)) return 1;
      if (!f.backdrop_path) return 3;
      return 2;
    };
    const ta = tier(a);
    const tb = tier(b);
    if (ta !== tb) return ta - tb;
    return (b.popularity ?? 0) - (a.popularity ?? 0);
  });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CollectionSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: CollectionData;
  onFilmAdded: (film: UserFilm) => void;
  onFilmRemoved: (filmId: number) => void;
  counterpartCollection?: CollectionData;
  onCounterpartFilmRemoved?: (filmId: number) => void;
  /** Union of film ids across all user collections — used to boost known films
   *  in ranking. Falls back to counterpartCollection ids if omitted. */
  allUserFilmIds?: Set<number>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CollectionSearchModal({
  isOpen,
  onClose,
  collection,
  onFilmAdded,
  onFilmRemoved,
  counterpartCollection,
  onCounterpartFilmRemoved,
  allUserFilmIds,
}: CollectionSearchModalProps) {
  const [searchInput, setSearchInput] = useState("");
  const [collectionFilmIds, setCollectionFilmIds] = useState<Set<number>>(
    new Set(collection.films.map((f) => f.id)),
  );
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [confirmPendingFilm, setConfirmPendingFilm] =
    useState<TMDBFilmSummary | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleClickOutside = useCallback(() => {
    if (!confirmPendingFilm) onClose();
  }, [confirmPendingFilm, onClose]);

  const modalRef = useClickOutside(handleClickOutside);

  const filmFetcher = useCallback(
    (q: string, page: number) => queryFilmFromTMDBPaged(q, page),
    [],
  );

  const { results, isSearching, isLoadingMore, hasMore, loadMore } =
    usePagedSearch<TMDBFilmSummary>(searchInput, isOpen, filmFetcher);

  // Re-initialize collection film ids each time the modal opens.
  const prevIsOpen = useRef(false);
  if (isOpen && !prevIsOpen.current) {
    setCollectionFilmIds(new Set(collection.films.map((f) => f.id)));
  }
  prevIsOpen.current = isOpen;

  const counterpartFilmIds = new Set(
    counterpartCollection?.films.map((f) => f.id) ?? [],
  );

  // "Known" = any film the user has in other collections. Use allUserFilmIds
  // when available; fall back to just the counterpart collection.
  const knownFilmIds = allUserFilmIds ?? counterpartFilmIds;

  // Rank and wrap in sections. The "suggested" slot is empty for now — it will
  // be filled by an edge function layer once that exists.
  const ranked = rankFilmResults(results, collectionFilmIds, knownFilmIds);
  const sections: FilmResultSection[] = [{ kind: "standard", films: ranked }];
  const totalResultCount = ranked.length;

  useModalKeyboardNav({
    isOpen,
    resultsRef,
    inputRef: searchInputRef,
    resultCount: totalResultCount,
    onEscape: onClose,
  });

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
      if (hasMore && !isLoadingMore) loadMore();
    }
  }

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
        genres: fullFilm.genres,
        overview: fullFilm.overview,
        stars: 0 as StarRating,
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
      if (counterpartCollection && counterpartFilmIds.has(film.id)) {
        setConfirmPendingFilm(film);
        return;
      }
      await executeAdd(film, false);
      return;
    }

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

      <SearchModalShell
        inputRef={searchInputRef}
        modalRef={modalRef}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        onClose={onClose}
        placeholder="Add or remove films from collection..."
        header={
          <div className="p-3 lg:pt-4 lg:px-5 pb-0 lg:text-2xl text-light font-semibold">
            {collection.title}
          </div>
        }
      >
        {searchInput.trim().length > 0 && (
          <div
            className="w-full text-light p-2 max-h-[60vh] overflow-y-auto"
            ref={resultsRef}
            onScroll={handleScroll}
          >
            {isSearching ? (
              <div className="flex justify-center items-center py-6">
                <Loader className="size-5 animate-spin text-light/50" />
              </div>
            ) : totalResultCount === 0 ? (
              <div className="m-2 ml-4">No results found.</div>
            ) : (
              <div className="flex flex-col justify-center gap-0">
                {sections.map((section) => (
                  <div key={section.kind}>
                    {section.kind === "suggested" && (
                      <div className="px-3 py-1 text-xs text-light/50 uppercase tracking-wider">
                        {section.label}
                      </div>
                    )}
                    {section.films.map((film) => {
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
                ))}

                {isLoadingMore && (
                  <div className="flex justify-center items-center py-3">
                    <Loader className="size-4 animate-spin text-light/40" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </SearchModalShell>
    </>
  );
}
