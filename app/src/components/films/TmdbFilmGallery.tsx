import { useRef } from "react"
import TmdbFilmCard from "./TmdbFilmCard"
import type { TMDBFilmSummary } from "@/types/tmdb"
import type { DiscoverPageState } from "@/types/map"
import FilmCardSkeleton from "./FilmCardSkeleton"

interface FilmTMDB_GalleryProps {
  listOfFilmObjects: TMDBFilmSummary[]
  /** Optional — only needed on pages that have pagination (MapPage). */
  setPage?: React.Dispatch<React.SetStateAction<DiscoverPageState>>
  isLoading?: boolean
}

export default function TmdbFilmGallery({
  listOfFilmObjects,
  setPage,
  isLoading,
}: FilmTMDB_GalleryProps) {
  const imgRefs = useRef<Map<number, HTMLImageElement>>(new Map())

  if (isLoading) {
    return (
      <div
        className="w-full flex 
          flex-col items-center">
        <div
          className="flex      
         flex-col items-center gap-0 mt-5  
         mb-20 w-full">
          <div className="filmGallery-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <FilmCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center">
      {listOfFilmObjects && listOfFilmObjects.length === 0 && (
        <div className="mt-10 mb-20 text-sm @3xl:text-base">
          No films found based on current settings.
        </div>
      )}

      {listOfFilmObjects && listOfFilmObjects.length > 0 && (
        <div className="flex flex-col items-center gap-0 mt-5 mb-20 w-full">
          <div className="filmGallery-grid">
            {listOfFilmObjects.map((filmObject) => (
              <TmdbFilmCard
                key={filmObject.id}
                filmObject={filmObject}
                setPage={setPage}
                imgRef={(node) => {
                  if (node) imgRefs.current.set(filmObject.id, node)
                  else imgRefs.current.delete(filmObject.id)
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
