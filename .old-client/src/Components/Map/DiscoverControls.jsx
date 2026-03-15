import Toggle_Three from "../Shared/Buttons/Toggle_Three"
import CustomSlider from "../Shared/Buttons/CustomSlider"

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
}) {
  return (
    <div className="flex flex-col items-center gap-0 mb-7">
      <Toggle_Three
        label="Sort By"
        width="20rem"
        height="2.5rem"
        state={discoverBy}
        setState={setDiscoverBy}
        stateDetails={{
          1: { value: "random", label: "Random" },
          2: { value: "vote_average.desc", label: "Top Rated" },
          3: { value: "vote_count.desc", label: "Most Voted" },
        }}
      />
      <div className="toggleButton-whole">
        <div className="toggleButton-label">Filter</div>
        <div className="flex flex-col items-center justify-center gap-6 p-6 rounded-3xl bg-gray-200 filterButton-container">
          <div className="w-full flex flex-col items-center justify-center gap-2 uppercase font-semibold text-gray-600">
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
          <div className="w-full flex flex-col items-center justify-center gap-2 uppercase font-semibold text-gray-600">
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
