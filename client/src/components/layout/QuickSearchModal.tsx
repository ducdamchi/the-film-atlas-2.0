import { useCallback, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";

import { getReleaseYear } from "@/utils/helperFunctions";
import {
  queryFilmFromTMDB,
  queryPersonFromTMDB,
  queryMultiFromTMDB,
} from "@/utils/apiCalls";
import useClickOutside from "@/hooks/useClickOutside";
import { useModalKeyboardNav } from "@/hooks/useModalKeyboardNav";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";
import SearchModalShell from "@/components/shared/SearchModalShell";

import { BiSolidRightArrowSquare } from "react-icons/bi";
import { Loader } from "lucide-react";

import type { TMDBFilmSummary, TMDBPerson, TMDBSearchResult } from "@/types/tmdb";

const imgBaseUrl = "https://image.tmdb.org/t/p/original";

const SECTION_NAMES = ["Films", "Directors", "Actors"] as const;
type SectionName = (typeof SECTION_NAMES)[number];

interface QuickSearchModalProps {
  searchModalOpen: boolean;
  setSearchModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

function rankFilms(films: TMDBFilmSummary[]): TMDBFilmSummary[] {
  return [...films].sort((a, b) => {
    const hasBackdropA = !!a.backdrop_path;
    const hasBackdropB = !!b.backdrop_path;
    if (hasBackdropA !== hasBackdropB) return hasBackdropA ? -1 : 1;
    return (b.popularity ?? 0) - (a.popularity ?? 0);
  });
}

function applyEmptyToEnd(
  order: SectionName[],
  counts: Record<SectionName, number>,
): SectionName[] {
  const nonEmpty = order.filter((s) => counts[s] > 0);
  const empty = order.filter((s) => counts[s] === 0);
  return [...nonEmpty, ...empty];
}

function rankSections(multiResults: TMDBSearchResult[]): SectionName[] {
  const scores: Record<SectionName, number> = {
    Films: 0,
    Directors: 0,
    Actors: 0,
  };
  // Weight top results more heavily: 1st = 5pts, 2nd = 4pts, ... 5th+ = 1pt
  multiResults.slice(0, 5).forEach((item, i) => {
    const weight = Math.max(5 - i, 1);
    if (item.media_type === "movie") {
      scores.Films += weight;
    } else if (item.media_type === "person") {
      if (item.known_for_department === "Directing") scores.Directors += weight;
      else if (item.known_for_department === "Acting") scores.Actors += weight;
    }
  });
  return [...SECTION_NAMES].sort((a, b) => scores[b] - scores[a]);
}

interface SearchResultItemProps {
  to: string;
  imageSrc: string;
  label: string;
  sublabel: string | number | "N/A" | null;
  linkText: string;
}

function SearchResultItem({
  to,
  imageSrc,
  label,
  sublabel,
  linkText,
}: SearchResultItemProps) {
  return (
    <Link
      className="search-result w-full h-[4rem] md:h-[5rem] flex justify-start items-center md:gap-1 gap-0 md:p-2 p-1 focus:bg-blue-600/80 hover:bg-light/20 focus:outline-0 rounded-md"
      to={to}
    >
      <div className="group/thumbnail relative max-h-[5rem] max-w-[8rem] aspect-16/10 h-full">
        <img
          className="h-full w-auto object-cover transition-all duration-300 ease-out group-hover/thumbnail:scale-[1.03]"
          src={imageSrc}
          alt=""
        />
      </div>
      <div className="text-sm lg:text-base w-full p-3">
        <span className="font-bold uppercase">{label.slice(0, 20)}</span>
        {label.length >= 20 && (
          <span className="font-bold uppercase text-lg">...</span>
        )}
        {sublabel && (
          <>
            <br />
            <span>{sublabel}</span>
          </>
        )}
      </div>
      <div className="flex w-[3rem] md:w-[12rem] items-center justify-center gap-1">
        <span className="hidden md:block text-base">{linkText}</span>
        <BiSolidRightArrowSquare className="text-xl" />
      </div>
    </Link>
  );
}

interface SearchSectionProps<T> {
  title: string;
  results: T[];
  maxItems: number;
  renderItem: (item: T, key: number) => React.ReactNode;
}

function SearchSection<T>({
  title,
  results,
  maxItems,
  renderItem,
}: SearchSectionProps<T>) {
  return (
    <div className="mt-2">
      <div className="p-2 pb-1">{title}</div>
      {results.length === 0 ? (
        <div className="m-2 ml-4">No results found.</div>
      ) : (
        <div className="flex flex-col justify-center gap-0">
          {results.slice(0, maxItems).map((item, key) => renderItem(item, key))}
        </div>
      )}
    </div>
  );
}

type QuickSearchResult = [TMDBFilmSummary[], TMDBPerson[], TMDBPerson[]];

export default function QuickSearchModal({
  searchModalOpen,
  setSearchModalOpen,
}: QuickSearchModalProps) {
  const [searchInput, setSearchInput] = useState("");
  const [sectionOrder, setSectionOrder] = useState<SectionName[]>([
    "Films",
    "Directors",
    "Actors",
  ]);

  const searchModalRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const closeModal = useCallback(() => setSearchModalOpen(false), [setSearchModalOpen]);
  const modalRef = useClickOutside(closeModal);

  const allQueryFetcher = useCallback(
    async (q: string): Promise<QuickSearchResult> => {
      const [result_film, result_persons, result_multi] = await Promise.all([
        queryFilmFromTMDB(q),
        queryPersonFromTMDB(q),
        queryMultiFromTMDB(q),
      ]);
      setSectionOrder(rankSections(result_multi));
      return [
        result_film,
        result_persons.filter((p) => p.known_for_department === "Directing"),
        result_persons.filter((p) => p.known_for_department === "Acting"),
      ];
    },
    [],
  );

  const { result, isSearching } = useDebounceSearch<QuickSearchResult>(
    searchInput,
    searchModalOpen,
    allQueryFetcher,
  );

  const [rawFilms, searchResult_Director, searchResult_Actor] =
    result ?? [[], [], []];
  const searchResult_Film = rankFilms(rawFilms);

  const counts: Record<SectionName, number> = {
    Films: searchResult_Film.length,
    Directors: searchResult_Director.length,
    Actors: searchResult_Actor.length,
  };
  const orderedSections = applyEmptyToEnd(sectionOrder, counts);

  useModalKeyboardNav({
    isOpen: searchModalOpen,
    resultsRef,
    inputRef: searchModalRef,
    resultCount: searchResult_Film.length + searchResult_Director.length + searchResult_Actor.length,
    onEscape: closeModal,
  });

  return (
    <SearchModalShell
      inputRef={searchModalRef}
      modalRef={modalRef}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      onClose={closeModal}
      placeholder="Quick search for anything..."
      onEnter={(value) =>
        navigate({
          to: "/films",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          state: { searchInputFromQuickSearch: value } as any,
        })
      }
    >
      {isSearching ? (
        <div className="flex justify-center items-center py-6">
          <Loader className="size-5 animate-spin text-light/50" />
        </div>
      ) : result !== null && (
        <div
          className="w-full text-light p-2 max-h-[60vh] overflow-y-auto"
          ref={resultsRef}
        >
          {orderedSections.map((section) => {
            if (section === "Films")
              return (
                <SearchSection<TMDBFilmSummary>
                  key="Films"
                  title="Films"
                  results={searchResult_Film}
                  maxItems={7}
                  renderItem={(film, key) => (
                    <SearchResultItem
                      key={key}
                      to={`/films/${film.id}`}
                      imageSrc={
                        film.backdrop_path
                          ? `${imgBaseUrl}${film.backdrop_path}`
                          : "backdropnotfound.jpg"
                      }
                      label={film.title}
                      sublabel={
                        film.release_date
                          ? getReleaseYear(film.release_date)
                          : null
                      }
                      linkText="Visit Page"
                    />
                  )}
                />
              );
            if (section === "Directors")
              return (
                <SearchSection<TMDBPerson>
                  key="Directors"
                  title="Directors"
                  results={searchResult_Director}
                  maxItems={3}
                  renderItem={(person, key) => (
                    <SearchResultItem
                      key={key}
                      to={`/person/director/${person.id}`}
                      imageSrc={
                        person.profile_path
                          ? `${imgBaseUrl}${person.profile_path}`
                          : "/picnotfound.jpg"
                      }
                      label={person.name}
                      sublabel={null}
                      linkText="Visit Page"
                    />
                  )}
                />
              );
            if (section === "Actors")
              return (
                <SearchSection<TMDBPerson>
                  key="Actors"
                  title="Actors"
                  results={searchResult_Actor}
                  maxItems={3}
                  renderItem={(person, key) => (
                    <SearchResultItem
                      key={key}
                      to={`/person/actor/${person.id}`}
                      imageSrc={
                        person.profile_path
                          ? `${imgBaseUrl}${person.profile_path}`
                          : "/picnotfound.jpg"
                      }
                      label={person.name}
                      sublabel={null}
                      linkText="Visit Page"
                    />
                  )}
                />
              );
            return null;
          })}
        </div>
      )}
    </SearchModalShell>
  );
}
