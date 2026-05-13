import Toggle from "../ui-custom/Toggle";
import { FaSortNumericDown, FaSortNumericDownAlt } from "react-icons/fa";

type MapQueryString = "watched" | "watchlisted" | "rated";

type SortBy = "added_date" | "released_date";
type SortDirection = "asc" | "desc";

interface MyFilmsControlsProps {
  queryString: MapQueryString;
  setQueryString: (val: MapQueryString | "discover") => void;
  sortBy: SortBy;
  setSortBy: (val: SortBy) => void;
  sortDirection: SortDirection;
  setSortDirection: (val: SortDirection) => void;
  numStars: number;
  setNumStars: (val: number) => void;
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
          { value: "watched", label: "Watched" },
          { value: "watchlisted", label: "Watchlist" },
          { value: "rated", label: "Rated" },
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
      {queryString === "rated" && (
        <Toggle<number>
          label="Rating"
          value={numStars}
          onChange={setNumStars}
          options={[
            { value: 0, label: <span>All</span> },
            {
              value: 3,
              label: (
                <span className="text-2xl text-star">
                  &#10048;&#10048;&#10048;
                </span>
              ),
            },
            {
              value: 2,
              label: (
                <span className="text-2xl text-star">&#10048;&#10048;</span>
              ),
            },
            {
              value: 1,
              label: <span className="text-2xl text-star">&#10048;</span>,
            },
          ]}
        />
      )}
    </>
  );
}
