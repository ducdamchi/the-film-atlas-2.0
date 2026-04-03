import type { UserFilm } from "@/types/film";
import CollectionCarousel from "./CollectionCarousel";
import CollectionGrid from "./CollectionGrid";
import UserFilmCard from "../films/UserFilmCard";

interface Collection {
  title: string;
  films: UserFilm[];
  queryString: string | null;
}

interface CollectionRowProps {
  collection: Collection;
  isExpanded: boolean;
}

export default function CollectionRow({
  collection,
  isExpanded,
}: CollectionRowProps) {
  return (
    <div className="w-full border-muted-light">
      {/* Header */}
      {/* <div className="flex items-center justify-between px-4 md:px-8 py-3">
        <span className="page-subtitle">{collection.title}</span>

        <div className="flex items-center gap-3">
          <span className="text-label text-sm">
            {collection.films.length} films
          </span>
        </div>
      </div> */}

      {/* Content */}
      <div className="w-full transition-opacity duration-200">
        {isExpanded ? (
          <div className="@container overflow-visible w-full flex justify-center gap-0 mt-5">
            <div className="flex flex-col gap-2 min-w-[24rem] ">
              <div className="page-subtitle px-8">{collection.title}</div>
              <div className="filmGallery-grid max-h-[36rem] overflow-y-auto px-8 py-5">
                {collection.films.map((film) => (
                  <UserFilmCard
                    key={film.id}
                    filmObject={film}
                    queryString={collection.queryString}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <CollectionCarousel
            films={collection.films}
            queryString={collection.queryString}
          />
        )}
      </div>
    </div>
  );
}
