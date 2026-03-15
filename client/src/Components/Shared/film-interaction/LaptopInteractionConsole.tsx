import { useNavigate } from "@tanstack/react-router"
import InteractionConsole from "./InteractionConsole"
import type { TMDBFilmSummary, TMDBFilm, TMDBCrewMember } from "@/types/tmdb"
import type { UserFilm } from "@/types/film"
import type { DiscoverPageState } from "@/types/map"

interface LaptopInteractionConsoleProps {
  hoverId: number | null
  /** Either a TMDB film summary (from the discover gallery) or a user's saved film */
  filmObject: TMDBFilmSummary | UserFilm
  directors: TMDBCrewMember[]
  /** Full TMDB film detail — may be an empty object `{}` while loading */
  movieDetails: TMDBFilm | Record<string, never>
  isLoading: boolean
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  showOverview: boolean
  setPage?: React.Dispatch<React.SetStateAction<DiscoverPageState>>
}

export default function LaptopInteractionConsole({
  hoverId,
  filmObject,
  directors,
  movieDetails,
  isLoading,
  setIsLoading,
  showOverview,
  setPage,
}: LaptopInteractionConsoleProps) {
  const navigate = useNavigate()
  const isHovered = hoverId === filmObject.id
  const details = movieDetails as TMDBFilm

  return (
    <div className={`hidden md:flex absolute inset-0 bg-black/70 items-center justify-center z-10 transition-opacity duration-200 ${isHovered ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
      {showOverview && (
        <div className="flex flex-col justify-end items-center pb-4 lg:pb-6">
          <div
            className="w-full text-white px-7 pb-5 lg:pb-6"
            onClick={() => {
              navigate({ to: `/films/${filmObject.id}` })
              if (setPage) {
                setPage((prevPage) => ({ ...prevPage, loadMore: false }))
              }
            }}>
            <span className="text-sm lg:text-base italic font-light line-clamp-4">
              {details?.overview || (filmObject as TMDBFilmSummary).overview}
            </span>
          </div>
          {/* console for <lg (1024px) breakpoint */}
          <div className="lg:hidden">
            <InteractionConsole
              tmdbId={hoverId}
              directors={directors}
              movieDetails={movieDetails}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              variant="overlay-sm"
              showOverview={false}
            />
          </div>
          {/* console for >= lg (1024px) breakpoint */}
          <div className="hidden lg:flex">
            <InteractionConsole
              tmdbId={hoverId}
              directors={directors}
              movieDetails={movieDetails}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              variant="overlay-lg"
              showOverview={false}
            />
          </div>
        </div>
      )}

      {!showOverview && (
        <div className="flex flex-col justify-center items-center h-full pb-4 lg:pb-6">
          {/* console for <lg (1024px) breakpoint */}
          <div className="lg:hidden z-20">
            <InteractionConsole
              tmdbId={hoverId}
              directors={directors}
              movieDetails={movieDetails}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              variant="overlay-sm"
              showOverview={false}
            />
          </div>
          {/* console for >= lg (1024px) breakpoint */}
          <div className="hidden lg:flex">
            <InteractionConsole
              tmdbId={hoverId}
              directors={directors}
              movieDetails={movieDetails}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              variant="overlay-lg"
              showOverview={false}
            />
          </div>
          <div
            className="border-red-500 absolute w-full h-full z-0 bottom-0"
            onClick={() => {
              navigate({ to: `/films/${filmObject.id}` })
              if (setPage) {
                setPage((prevPage) => ({ ...prevPage, loadMore: false }))
              }
            }}></div>
        </div>
      )}
    </div>
  )
}
