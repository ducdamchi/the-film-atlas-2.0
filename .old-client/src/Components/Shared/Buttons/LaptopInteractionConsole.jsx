import { useNavigate } from "react-router-dom"
import InteractionConsole from "./InteractionConsole"

export default function LaptopInteractionConsole({
  hoverId,
  filmObject,
  directors,
  movieDetails,
  isLoading,
  setIsLoading,
  hasOverview,
  setPage,
}) {
  const navigate = useNavigate()
  const isHovered = hoverId === filmObject.id
  return (
      <div className={`hidden md:flex absolute inset-0 bg-black/70 items-center justify-center z-10 transition-opacity duration-200 ${isHovered ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        {hasOverview && (
          <div className="flex flex-col justify-end items-center pb-4 lg:pb-6">
            <div
              className="w-full text-white px-7 pb-5 lg:pb-6"
              onClick={() => {
                navigate(`/films/${filmObject.id}`)
                if (setPage) {
                  setPage((prevPage) => ({ ...prevPage, loadMore: false }))
                }
              }}>
              <span className="text-sm lg:text-base italic font-light line-clamp-4">
                {movieDetails?.overview || filmObject.overview}
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
                css={{
                  height: "1.4rem",
                  textColor: "white",
                  hoverBg: "none",
                  hoverTextColor: "oklch(70.7% 0.165 254.624)",
                  fontSize: "12px",
                  likeSize: "1rem",
                  saveSize: "1.4rem",
                  starSize: "1.2rem",
                  flexGap: "4px",
                  likeColor: "white",
                  saveColor: "white",
                  likedBgColor: "oklch(44.4% 0.177 26.899)",
                  savedBgColor: "oklch(44.8% 0.119 151.328)",
                  buttonPadding: "4px",
                  paddingTopBottom: "6px",
                  paddingLeftRight: "10px",
                  buttonHeight: "1.7rem",
                }}
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
                css={{
                  height: "1.4rem",
                  textColor: "white",
                  hoverBg: "none",
                  hoverTextColor: "oklch(70.7% 0.165 254.624)",
                  fontSize: "14px",
                  likeSize: "1rem",
                  saveSize: "1.4rem",
                  starSize: "1.3rem",
                  flexGap: "4px",
                  likeColor: "white",
                  saveColor: "white",
                  likedBgColor: "oklch(44.4% 0.177 26.899)",
                  savedBgColor: "oklch(44.8% 0.119 151.328)",
                  buttonPadding: "4px",
                  paddingTopBottom: "16px",
                  paddingLeftRight: "16px",
                  buttonHeight: "2.2rem",
                }}
                showOverview={false}
              />
            </div>
          </div>
        )}

        {!hasOverview && (
          <div className="flex flex-col justify-center items-center h-full pb-4 lg:pb-6">
            {/* console for <lg (1024px) breakpoint */}
            <div className="lg:hidden z-20">
              <InteractionConsole
                tmdbId={hoverId}
                directors={directors}
                movieDetails={movieDetails}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                css={{
                  height: "1.4rem",
                  textColor: "white",
                  hoverBg: "none",
                  hoverTextColor: "oklch(70.7% 0.165 254.624)",
                  fontSize: "12px",
                  likeSize: "1rem",
                  saveSize: "1.4rem",
                  starSize: "1.2rem",
                  flexGap: "4px",
                  likeColor: "white",
                  saveColor: "white",
                  likedBgColor: "oklch(44.4% 0.177 26.899)",
                  savedBgColor: "oklch(44.8% 0.119 151.328)",
                  buttonPadding: "4px",
                  paddingTopBottom: "6px",
                  paddingLeftRight: "10px",
                  buttonHeight: "1.7rem",
                }}
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
                css={{
                  height: "1.4rem",
                  textColor: "white",
                  hoverBg: "none",
                  hoverTextColor: "oklch(70.7% 0.165 254.624)",
                  fontSize: "14px",
                  likeSize: "1rem",
                  saveSize: "1.4rem",
                  starSize: "1.3rem",
                  flexGap: "4px",
                  likeColor: "white",
                  saveColor: "white",
                  likedBgColor: "oklch(44.4% 0.177 26.899)",
                  savedBgColor: "oklch(44.8% 0.119 151.328)",
                  buttonPadding: "4px",
                  paddingTopBottom: "16px",
                  paddingLeftRight: "16px",
                  buttonHeight: "2.2rem",
                }}
                showOverview={false}
              />
            </div>
            <div
              className="border-red-500 absolute w-full h-full z-0 bottom-0"
              onClick={() => {
                navigate(`/films/${filmObject.id}`)
                if (setPage) {
                  setPage((prevPage) => ({ ...prevPage, loadMore: false }))
                }
              }}></div>
          </div>
        )}
      </div>
    )
}
