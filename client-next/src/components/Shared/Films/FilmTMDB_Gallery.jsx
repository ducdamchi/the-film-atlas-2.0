import FilmTMDB_Card from "./FilmTMDB_Card"

export default function FilmTMDB_Gallery({ listOfFilmObjects, setPage }) {
  return (
    <div>
      {listOfFilmObjects && listOfFilmObjects.length === 0 && (
        <div className="mt-10 mb-20 text-sm md:text-base">No films found.</div>
      )}

      {listOfFilmObjects && listOfFilmObjects.length > 0 && (
        <div className="flex flex-col justify-center gap-0 mt-5 mb-20">
          <div className="filmGallery-grid">
            {listOfFilmObjects.map((filmObject, key) => (
              /* Each film item */

              <FilmTMDB_Card
                key={key}
                filmObject={filmObject}
                setPage={setPage}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
