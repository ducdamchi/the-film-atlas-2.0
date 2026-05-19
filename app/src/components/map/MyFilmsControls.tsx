import { useAtom } from "jotai";
import Toggle from "../ui-custom/Toggle";
import { FaSortNumericDown, FaSortNumericDownAlt } from "react-icons/fa";
import {
  map_modeAtom,
  map_userSortAtom,
  map_userSortDirAtom,
  map_starsAtom,
  map_userFilterAtom,
} from "@/atoms/mapAtoms";

type MapQueryString = "watched" | "watchlisted" | "rated";
type SortBy = "added_date" | "released_date";
type SortDirection = "asc" | "desc";

export default function MyFilmsControls() {
  const [, setMapMode] = useAtom(map_modeAtom)
  const [sortBy, setSortBy] = useAtom(map_userSortAtom)
  const [sortDirection, setSortDirection] = useAtom(map_userSortDirAtom)
  const [numStars, setNumStars] = useAtom(map_starsAtom)
  const [ufilter, setUfilter] = useAtom(map_userFilterAtom)

  const setQueryString = (val: MapQueryString) => {
    setMapMode(val)
    if (val !== "rated") setNumStars(0)
    setUfilter(val)
  }

  return (
    <>
      <Toggle<MapQueryString>
        label="Filter"
        value={ufilter}
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
      {ufilter === "rated" && (
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
