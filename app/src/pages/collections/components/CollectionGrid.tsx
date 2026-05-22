import UserFilmCard from "../films/UserFilmCard"
import type { UserFilm } from "@/types/film"

interface CollectionGridProps {
  films: UserFilm[]
  queryString: string | null
}

export default function CollectionGrid({
  films,
  queryString,
}: CollectionGridProps) {
  return (
    <div className="@container overflow-visible w-full flex flex-col items-center gap-0 mt-5">
      <div className="flex flex-col gap-2 max-h-[30rem] overflow-x-clip overflow-y-visible">
        <div className="page-subtitle">Example title</div>
        <div className="filmGallery-grid  ">
          {films.map((film) => (
            <UserFilmCard
              key={film.id}
              filmObject={film}
              queryString={queryString}
            />
          ))}
        </div>
      </div>
      <div className="sticky bottom-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </div>
  )
}
