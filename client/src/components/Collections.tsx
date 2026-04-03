/* Libraries */
import { useState, useEffect } from "react";

/* Custom functions */
import { useAuth } from "@/utils/authContext";
import { fetchListByParams } from "@/utils/apiCalls";

/* Types */
import type { UserFilm } from "@/types/film";

/* Components */
import SearchBar from "./layout/SearchBar";
import CollectionRow from "./collections/CollectionRow";
import { LayoutGrid, GalleryHorizontal } from "lucide-react";

export default function Collections() {
  const [searchInput, setSearchInput] = useState<string>("");
  const [watchedFilms, setWatchedFilms] = useState<UserFilm[]>([]);
  const [watchlistedFilms, setWatchlistedFilms] = useState<UserFilm[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  const { authState } = useAuth();

  useEffect(() => {
    if (!authState.status) return;
    Promise.all([
      fetchListByParams({ queryString: "watched" }),
      fetchListByParams({ queryString: "watchlisted" }),
    ]).then(([watched, watchlisted]) => {
      setWatchedFilms(watched);
      setWatchlistedFilms(watchlisted);
    });
  }, [authState.status]);

  return (
    <div className="font-primary mt-20 min-h-screen">
      <div className="flex flex-col items-center">
        <div className="font-heading page-title">COLLECTIONS</div>
        <SearchBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          placeholderString="Search your collections ..."
        />
        {!authState.status ? (
          <div className="mt-10 mb-20 text-sm md:text-base">
            Log in to view your collections!
          </div>
        ) : (
          <section className="w-full mt-8 flex flex-col justify-center gap-10">
            <div className="flex justify-center items-center border-1">
              <button
                onClick={() => setIsExpanded((prev) => !prev)}
                className="p-2 bg-control rounded-full hover:bg-dark/10 transition-colors duration-150 text-dark"
                aria-label={
                  isExpanded ? "Switch to carousel view" : "Switch to grid view"
                }
              >
                {isExpanded ? (
                  <GalleryHorizontal size={18} />
                ) : (
                  <LayoutGrid size={18} />
                )}
              </button>
            </div>
            <CollectionRow
              collection={{
                title: "Watchlist",
                films: watchlistedFilms,
                queryString: "watchlisted",
              }}
              isExpanded={isExpanded}
            />
            <CollectionRow
              collection={{
                title: "Watched",
                films: watchedFilms,
                queryString: "watched",
              }}
              isExpanded={isExpanded}
            />
          </section>
        )}
      </div>
    </div>
  );
}
