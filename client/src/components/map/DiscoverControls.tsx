import type { Dispatch, SetStateAction } from "react"
import Toggle from "../ui-controls/Toggle"
import CustomSlider from "../ui-controls/CustomSlider"

type DiscoverBy = string

interface DiscoverControlsProps {
  discoverBy: DiscoverBy
  setDiscoverBy: Dispatch<SetStateAction<DiscoverBy>>
  ratingRange: [number, number]
  setRatingRange: Dispatch<SetStateAction<[number, number]>>
  tempRatingRange: [number, number]
  setTempRatingRange: Dispatch<SetStateAction<[number, number]>>
  voteCountRange: [number, number]
  setVoteCountRange: Dispatch<SetStateAction<[number, number]>>
  tempVoteCountRange: [number, number]
  setTempVoteCountRange: Dispatch<SetStateAction<[number, number]>>
}

export default function DiscoverControls({
  discoverBy,
  setDiscoverBy,
  ratingRange,
  setRatingRange,
  tempRatingRange,
  setTempRatingRange,
  voteCountRange,
  setVoteCountRange,
  tempVoteCountRange,
  setTempVoteCountRange,
}: DiscoverControlsProps) {
  return (
    <div className="flex flex-col items-center gap-0 mb-7">
      <Toggle<DiscoverBy>
        label="Sort By"
        value={discoverBy}
        onChange={setDiscoverBy}
        options={[
          { value: "random", label: "Random" },
          { value: "vote_average.desc", label: "Top Rated" },
          { value: "vote_count.desc", label: "Most Voted" },
        ]}
      />
      <div className="toggleButton-whole">
        <div className="toggleButton-label">Filter</div>
        <div className="flex flex-col items-center justify-center gap-6 p-6 rounded-3xl bg-control filterButton-container">
          <div className="w-full flex flex-col items-center justify-center gap-2 uppercase font-semibold text-label">
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
          <div className="w-full flex flex-col items-center justify-center gap-2 uppercase font-semibold text-label">
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
      </div>
    </div>
  )
}
