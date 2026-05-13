import Toggle from "../ui-custom/Toggle"
import CustomSlider from "../ui-custom/CustomSlider"
import type { FilterMode, DiscoverSort } from "@/routes/map"

interface DiscoverControlsProps {
  isoA2: string | undefined | null
  dsort: DiscoverSort
  filter: FilterMode
  ratingRange: [number, number]
  setRatingRange: (val: [number, number]) => void
  tempRatingRange: [number, number]
  setTempRatingRange: (val: [number, number]) => void
  voteCountRange: [number, number]
  setVoteCountRange: (val: [number, number]) => void
  tempVoteCountRange: [number, number]
  setTempVoteCountRange: (val: [number, number]) => void
  onDsortChange: (val: DiscoverSort) => void
  onFilterChange: (val: FilterMode) => void
}

export default function DiscoverControls({
  isoA2: _isoA2,
  dsort,
  filter,
  ratingRange,
  setRatingRange,
  tempRatingRange,
  setTempRatingRange,
  voteCountRange,
  setVoteCountRange,
  tempVoteCountRange,
  setTempVoteCountRange,
  onDsortChange,
  onFilterChange,
}: DiscoverControlsProps) {
  return (
    <div className="flex flex-col items-center gap-0 mb-7">
      <Toggle<DiscoverSort>
        label="Sort By"
        value={dsort}
        onChange={onDsortChange}
        options={[
          { value: "random", label: "Random" },
          { value: "vote_average.desc", label: "Top Rated" },
          { value: "vote_count.desc", label: "Most Voted" },
        ]}
      />

      <div className="toggleButton-whole">
        <Toggle<FilterMode>
          label="Filter"
          value={filter}
          onChange={onFilterChange}
          options={[
            { value: "recommended", label: "Recommended" },
            { value: "custom", label: "Custom" },
          ]}
        />
        {filter == "custom" && (
          <div className="flex flex-col items-center justify-center gap-6 p-6 rounded-3xl bg-muted filterButton-container">
            <div className="w-full flex flex-col items-center justify-center gap-2 uppercase font-semibold text-muted-foreground">
              <div>Average Rating &#x2265; {`${tempRatingRange[1]}`}</div>
              <CustomSlider
                width="15rem"
                id="slider-simple"
                min={0}
                max={10}
                step={0.1}
                tempRange={tempRatingRange}
                setTempRange={setTempRatingRange}
                range={ratingRange}
                setRange={setRatingRange}
                thumbsDisabled={[true, false]}
                rangeSlideDisabled={true}
              />
            </div>
            <div className="w-full flex flex-col items-center justify-center gap-2 uppercase font-semibold text-muted-foreground">
              <div>Vote Count &#x2265; {`${tempVoteCountRange[1]}`}</div>
              <CustomSlider
                width="15rem"
                id="slider-simple"
                min={0}
                max={500}
                step={20}
                tempRange={tempVoteCountRange}
                setTempRange={setTempVoteCountRange}
                range={voteCountRange}
                setRange={setVoteCountRange}
                thumbsDisabled={[true, false]}
                rangeSlideDisabled={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
