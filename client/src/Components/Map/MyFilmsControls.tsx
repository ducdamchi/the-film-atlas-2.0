import type { Dispatch, SetStateAction } from "react"
import Toggle from "../Shared/ui-controls/Toggle"
import { FaSortNumericDown, FaSortNumericDownAlt } from "react-icons/fa"

type MapQueryString =
  | "watched/by_country"
  | "watchlisted/by_country"
  | "watched/rated/by_country"

type SortBy = "added_date" | "released_date"
type SortDirection = "asc" | "desc"

interface MyFilmsControlsProps {
  queryString: MapQueryString
  setQueryString: Dispatch<SetStateAction<MapQueryString>>
  sortBy: SortBy
  setSortBy: Dispatch<SetStateAction<SortBy>>
  sortDirection: SortDirection
  setSortDirection: Dispatch<SetStateAction<SortDirection>>
  numStars: number | null
  setNumStars: Dispatch<SetStateAction<number | null>>
}

export default function MyFilmsControls({
  queryString,
  setQueryString,
  sortBy,
  setSortBy,
  sortDirection,
  setSortDirection,
  numStars,
  setNumStars,
}: MyFilmsControlsProps) {
  return (
    <>
      <Toggle<MapQueryString>
        label="Filter"
        value={queryString}
        onChange={setQueryString}
        options={[
          { value: "watched/by_country", label: "Watched" },
          { value: "watchlisted/by_country", label: "Watchlist" },
          { value: "watched/rated/by_country", label: "Rated" },
        ]}
      />
      <div className="flex flex-col items-center justify-center">
        <Toggle<SortBy>
          label="Sort By"
          value={sortBy}
          onChange={setSortBy}
          options={[
            { value: "added_date", label: "Recently Added" },
            { value: "released_date", label: "Released Year" },
          ]}
        />
        <Toggle<SortDirection>
          label="Sort Order"
          value={sortDirection}
          onChange={setSortDirection}
          options={[
            {
              value: "desc",
              label: <FaSortNumericDownAlt className="text-xl mt-0 w-[5rem]" />,
            },
            {
              value: "asc",
              label: <FaSortNumericDown className="text-xl mt-0 w-[5rem]" />,
            },
          ]}
        />
      </div>
      {queryString === "watched/rated/by_country" && (
        <Toggle<number | null>
          label="Rating"
          value={numStars}
          onChange={setNumStars}
          options={[
            { value: 0, label: <span>All</span> },
            {
              value: 3,
              label: (
                <span className="text-2xl text-pink-600">
                  &#10048;&#10048;&#10048;
                </span>
              ),
            },
            {
              value: 2,
              label: (
                <span className="text-2xl text-pink-600">&#10048;&#10048;</span>
              ),
            },
            {
              value: 1,
              label: (
                <span className="text-2xl text-pink-600">&#10048;</span>
              ),
            },
          ]}
        />
      )}
    </>
  )
}
