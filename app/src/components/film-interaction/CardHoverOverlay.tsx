import { useNavigate } from "@tanstack/react-router"
import InteractionConsole from "./InteractionConsole"
import SkeletonBlock from "@/components/ui-custom/SkeletonBlock"
import type {
  TMDBFilmSummary,
  TMDBFilm,
  TMDBCrewMember,
  TMDBSpokenLanguage,
} from "@/types/tmdb"
import type { UserFilm, DirectorRef } from "@/types/film"
import type { DiscoverPageState } from "@/types/map"
import { IoIosTimer } from "react-icons/io"
import { IoLanguageSharp, IoWarning } from "react-icons/io5"

// function useOverlayVariant(): "overlay-sm" | "overlay-lg" {
//   const [isLg, setIsLg] = useState(
//     () => window.matchMedia("(min-width: 1024px)").matches,
//   );
//   useEffect(() => {
//     const mq = window.matchMedia("(min-width: 1024px)");
//     const handler = (e: MediaQueryListEvent) => setIsLg(e.matches);
//     mq.addEventListener("change", handler);
//     return () => mq.removeEventListener("change", handler);
//   }, []);
//   return isLg ? "overlay-lg" : "overlay-sm";
// }

interface CardHoverOverlayProps {
  hoverId: number | null
  /** Either a TMDB film summary (from the discover gallery) or a user's saved film */
  filmObject: TMDBFilmSummary | UserFilm
  directors: TMDBCrewMember[] | DirectorRef[]
  /** Full TMDB detail, stored UserFilm, or empty object while loading */
  movieDetails: TMDBFilm | UserFilm | Record<string, never>
  isLoading: boolean
  fetchError?: boolean
  showOverview: boolean
  setPage?: React.Dispatch<React.SetStateAction<DiscoverPageState>>
  /** When true: renders as a slide-down panel below the card (Phase 2 behavior).
   *  Visibility is CSS group-hover driven — hoverId is ignored. */
  slideDown?: boolean
}

export default function CardHoverOverlay({
  hoverId,
  filmObject,
  directors,
  movieDetails,
  isLoading,
  fetchError = false,
  showOverview,
  setPage,
  slideDown = false,
}: CardHoverOverlayProps) {
  const navigate = useNavigate()
  // const isHovered = hoverId === filmObject.id;
  const details = movieDetails as TMDBFilm
  // const overlayVariant = useOverlayVariant();

  const handleNavigate = () => {
    navigate({ to: `/films/${filmObject.id}` })
    if (setPage) setPage((prevPage) => ({ ...prevPage, loadMore: false }))
  }

  if (slideDown) {
    return (
      /* Note: md break point here controls the desktop behavior of the card. specifically, mobile mode (< md) will display the card content as a block, giving it full space; while desktop mode (>= md) will display the card content as absolute, triggered only when user hovers over it.  */
      <div className="w-full md:w-auto md:absolute md:top-full md:left-0 md:right-0 bg-background text-foreground z-50 md:opacity-0 md:-translate-y-2 md:pointer-events-none md:group-hover/card:opacity-100 md:group-hover/card:translate-y-0 md:group-hover/card:pointer-events-auto md:transition-[opacity,transform] md:duration-200 md:ease-out">
        <div className="z-50 w-full p-5 @7xl:px-7 pt-4 flex flex-col items-center justify-start gap-2">
          <div className="z-50 flex justify-between items-center w-full">
            <div>
              <InteractionConsole
                tmdbId={filmObject.id}
                directors={directors}
                movieDetails={movieDetails}
                variant="card"
                showOverview={false}
              />
            </div>
            {/* <div>
              <button>
                <BiPlus className="border-1 aspect-square w-[1.5rem]" />
              </button>
            </div> */}
          </div>
          <div className="z-50 w-full" onClick={handleNavigate}>
            {fetchError ? (
              <span className="text-sm @7xl:text-base font-light text-muted flex items-start justify-center gap-1 z-50">
                <IoWarning className="text-lg @7xl:text-xl" /> Details
                unavailable.
              </span>
            ) : (
              <div className="flex flex-col items-start justify-center gap-1 w-full z-50">
                {/* Original title — skeleton while fetch pending, data or nothing once ready */}
                {isLoading ? (
                  <SkeletonBlock className="h-4 w-1/2" />
                ) : (
                  details?.original_title &&
                  details.original_title !== filmObject.title && (
                    <span className="text-sm @7xl:text-base font-bold">
                      {details.original_title}
                    </span>
                  )
                )}
                {/* Overview — always visible from filmObject immediately */}
                <span className="text-sm @7xl:text-base font-light line-clamp-4">
                  {details?.overview ||
                    (filmObject as TMDBFilmSummary).overview}
                </span>
                {/* Runtime + languages — skeleton pair while fetch pending */}
                {isLoading ? (
                  <div className="flex items-center gap-3 w-full">
                    <SkeletonBlock className="h-3 w-16" />
                    <SkeletonBlock className="h-3 w-28" />
                  </div>
                ) : (
                  <span className="flex items-center gap-3 w-full min-w-0 text-sm @7xl:text-base font-light">
                    {details?.runtime && (
                      <span className="flex items-center gap-1 shrink-0">
                        <IoIosTimer className="text-lg @7xl:text-xl" />
                        <span>{details.runtime} min</span>
                      </span>
                    )}
                    {details?.spoken_languages && (
                      <span className="flex items-center gap-1 min-w-0 max-w-[85%]">
                        <IoLanguageSharp className="text-lg @7xl:text-xl shrink-0" />
                        <span className="truncate">
                          {details?.spoken_languages
                            ?.map((l: TMDBSpokenLanguage) => l.english_name)
                            .join(", ")}
                        </span>
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
  // return (
  //   <div
  //     className={`hidden md:flex absolute inset-0 items-center justify-center z-10 ${!isHovered ? "pointer-events-none" : ""}`}
  //   >
  //     {/* Black overlay in its own div so its opacity transition doesn't create a stacking context
  //         around the InteractionConsole — backdrop-filter on console buttons requires no
  //         opacity-animated ancestor to correctly blur through to the film poster. */}
  //     <div
  //       className={`absolute inset-0 bg-black/70 transition-opacity duration-200 ${isHovered ? "opacity-100" : "opacity-0"}`}
  //     />

  //     {isHovered && showOverview && (
  //       <div className="flex flex-col justify-end items-center pb-4 @5xl:pb-6 relative z-10">
  //         <div
  //           className="w-full text-light px-7 pb-5 @5xl:pb-6"
  //           onClick={handleNavigate}
  //         >
  //           <span className="text-sm @5xl:text-base italic font-light line-clamp-4">
  //             {details?.overview || (filmObject as TMDBFilmSummary).overview}
  //           </span>
  //         </div>
  //         <InteractionConsole
  //           tmdbId={hoverId}
  //           directors={directors}
  //           movieDetails={movieDetails}
  //           isLoading={isLoading}
  //           setIsLoading={setIsLoading}
  //           variant={overlayVariant}
  //           showOverview={false}
  //         />
  //       </div>
  //     )}

  //     {isHovered && !showOverview && (
  //       <div className="flex flex-col justify-center items-center h-full pb-4 @5xl:pb-6 relative z-10">
  //         <InteractionConsole
  //           tmdbId={hoverId}
  //           directors={directors}
  //           movieDetails={movieDetails}
  //           isLoading={isLoading}
  //           setIsLoading={setIsLoading}
  //           variant={overlayVariant}
  //           showOverview={false}
  //         />
  //         <div
  //           className="absolute w-full h-full z-0 bottom-0"
  //           onClick={handleNavigate}
  //         />
  //       </div>
  //     )}
  //   </div>
  // );
}
