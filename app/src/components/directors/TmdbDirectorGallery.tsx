import { useNavigate } from "@tanstack/react-router"

/** A TMDB person result as returned by the directors query. */
interface TMDBDirectorResult {
  id: number
  name: string
  profile_path: string | null
  /** Films the director is known for (from TMDB known_for field) */
  known_for: Array<{
    id?: number
    media_type?: string
    title?: string
    name?: string
    original_title?: string
  }>
}

interface DirectorTMDB_GalleryProps {
  listOfDirectorObjects: TMDBDirectorResult[]
}

export default function TmdbDirectorGallery({
  listOfDirectorObjects,
}: DirectorTMDB_GalleryProps) {
  const imgBaseUrl = import.meta.env.VITE_TMDB_IMG_URL
  const navigate = useNavigate()

  return (
    <div>
      {listOfDirectorObjects.length === 0 && (
        <div className="mt-10 mb-20 text-sm md:text-base">
          No directors found.
        </div>
      )}

      {listOfDirectorObjects.length > 0 && (
        <div className="flex flex-col justify-center gap-0 mt-10 mb-20">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {listOfDirectorObjects.map((directorObject, key) => (
              /* Each film item */
              <div
                key={key}
                className="relative film-item w-[18rem] md:w-[25rem] md:min-w-[20rem] aspect-10/13 flex flex-col justify-center items-start gap-0 bg-zinc-200">
                {/* Profile */}
                <div className="relative group/thumbnail aspect-10/13 overflow-hidden w-[18rem] md:w-[25rem] md:min-w-[20rem] border-3 border-foreground">
                  <img
                    className="object-cover w-full transition-all duration-300 ease-out group-hover/thumbnail:scale-[1.03] grayscale transform -translate-y-1/10 z-10 brightness-110"
                    src={
                      directorObject.profile_path !== null
                        ? `${imgBaseUrl}${directorObject.profile_path}`
                        : `/picnotfound.jpg`
                    }
                    alt=""
                    onClick={() => {
                      navigate({ to: `/person/director/${directorObject.id}` })
                    }}
                  />
                  <div className="absolute bottom-0 left-0 h-[10rem] md:h-[15rem] w-full bg-gradient-to-t from-black/90 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 h-[10rem] md:h-[15rem] w-full flex flex-col items-center justify-end md:p-6 p-3 pb-4 md:pb-6 md:gap-1 gap-0 transition-all duration-200 ease-out group text-background">
                    <div
                      className="w-full hover:text-hover-light"
                      onClick={() => {
                        navigate({
                          to: `/person/director/${directorObject.id}`,
                        })
                      }}>
                      {directorObject.name.split(" ").map((word, key) => (
                        <div
                          key={key}
                          className="font-extrabold uppercase text-xl md:text-3xl">
                          {word}
                        </div>
                      ))}
                    </div>
                    <div className="w-full border-white text-[11px] md:text-sm italic mt-1 text-left font-thin">
                      {directorObject.known_for.map((filmObject, key) => (
                        <span key={key}>
                          {filmObject?.id &&
                          filmObject?.media_type === "movie" ? (
                            <span
                              className="hover:text-hover-light cursor-pointer"
                              onClick={(e) => {
                                navigate({ to: `/films/${filmObject.id}` })
                              }}>
                              {filmObject?.title ||
                                filmObject?.name ||
                                filmObject?.original_title}
                            </span>
                          ) : (
                            <span className="hover:text-hover-light">
                              {filmObject?.title ||
                                filmObject?.name ||
                                filmObject?.original_title}
                            </span>
                          )}
                          {key !== directorObject.known_for.length - 1 && (
                            <span className="">,&nbsp;</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
