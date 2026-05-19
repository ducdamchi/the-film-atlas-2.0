import Toggle from "../ui-custom/Toggle"
import type { DiscoverFilterMode, DiscoverSort } from "@/routes/map"
import ToggleWithSlider from "../ui-custom/ToggleWithSlider"

interface DiscoverControlsProps {
  isoA2: string | undefined | null
  dsort: DiscoverSort
  filter: DiscoverFilterMode
  ratingRange: [number, number]
  setRatingRange: (val: [number, number]) => void
  tempRatingRange: [number, number]
  setTempRatingRange: (val: [number, number]) => void
  voteCountRange: [number, number]
  setVoteCountRange: (val: [number, number]) => void
  tempVoteCountRange: [number, number]
  setTempVoteCountRange: (val: [number, number]) => void
  onDsortChange: (val: DiscoverSort) => void
  onFilterChange: (val: DiscoverFilterMode) => void
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

      <ToggleWithSlider<DiscoverFilterMode>
        label="Filter"
        value={filter}
        onChange={onFilterChange}
        options={[
          { value: "recommended", label: "Recommended" },
          { value: "custom", label: "Custom" },
        ]}
        ratingRange={ratingRange}
        setRatingRange={setRatingRange}
        tempRatingRange={tempRatingRange}
        setTempRatingRange={setTempRatingRange}
        voteCountRange={voteCountRange}
        setVoteCountRange={setVoteCountRange}
        tempVoteCountRange={tempVoteCountRange}
        setTempVoteCountRange={setTempVoteCountRange}
      />
    </div>
  )
}
