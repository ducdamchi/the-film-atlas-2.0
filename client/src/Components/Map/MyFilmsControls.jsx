import Toggle_Two from "../Shared/Buttons/Toggle_Two"
import Toggle_Three from "../Shared/Buttons/Toggle_Three"
import Toggle_Four from "../Shared/Buttons/Toggle_Four"
import { FaSortNumericDown, FaSortNumericDownAlt } from "react-icons/fa"

export default function MyFilmsControls({
  queryString,
  setQueryString,
  sortBy,
  setSortBy,
  sortDirection,
  setSortDirection,
  numStars,
  setNumStars,
}) {
  return (
    <>
      <Toggle_Three
        label="Filter"
        state={queryString}
        setState={setQueryString}
        stateDetails={{
          1: { value: "watched/by_country", label: "Watched" },
          2: { value: "watchlisted/by_country", label: "Watchlist" },
          3: { value: "watched/rated/by_country", label: "Rated" },
        }}
      />
      <div className="flex flex-col items-center justify-center">
        <Toggle_Two
          label="Sort By"
          width="20rem"
          height="2.5rem"
          state={sortBy}
          setState={setSortBy}
          stateDetails={{
            1: { value: "added_date", label: "Recently Added" },
            2: { value: "released_date", label: "Released Year" },
          }}
        />
        <Toggle_Two
          label="Sort Order"
          width="10rem"
          height="2.5rem"
          state={sortDirection}
          setState={setSortDirection}
          stateDetails={{
            1: {
              value: "desc",
              label: <FaSortNumericDownAlt className="text-xl mt-0 w-[5rem]" />,
            },
            2: {
              value: "asc",
              label: <FaSortNumericDown className="text-xl mt-0 w-[5rem]" />,
            },
          }}
        />
      </div>
      {queryString === "watched/rated/by_country" && (
        <Toggle_Four
          label="Rating"
          width="20rem"
          height="2.5rem"
          state={numStars}
          setState={setNumStars}
          stateDetails={{
            1: { value: 0, label: <span>All</span> },
            2: {
              value: 3,
              label: (
                <span className="text-2xl text-pink-600">
                  &#10048;&#10048;&#10048;
                </span>
              ),
            },
            3: {
              value: 2,
              label: (
                <span className="text-2xl text-pink-600">&#10048;&#10048;</span>
              ),
            },
            4: {
              value: 1,
              label: (
                <span className="text-2xl text-pink-600">&#10048;</span>
              ),
            },
          }}
        />
      )}
    </>
  )
}
