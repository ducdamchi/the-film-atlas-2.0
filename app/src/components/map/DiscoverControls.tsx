import { useState, useEffect } from "react"
import { useAtom } from "jotai"
import Toggle from "../ui-custom/Toggle"
import type { DiscoverFilterMode, DiscoverSort } from "@/routes/map"
import ToggleWithSlider from "../ui-custom/ToggleWithSlider"
import {
  map_discoverSortAtom,
  map_discoverFilterAtom,
  map_ratingAtom,
  map_votesAtom,
} from "@/atoms/mapAtoms"
import { COUNTRY_DEFAULTS, GLOBAL_DEFAULTS } from "@/data/countryDefaults"

interface DiscoverControlsProps {
  isoA2?: string
}

export default function DiscoverControls({ isoA2 }: DiscoverControlsProps) {
  const [dsort, setDsort] = useAtom(map_discoverSortAtom)
  const [filter, setDiscoverFilter] = useAtom(map_discoverFilterAtom)
  const [rating, setRating] = useAtom(map_ratingAtom)
  const [votes, setVotes] = useAtom(map_votesAtom)

  const ratingRange: [number, number] = [0, rating]
  const voteCountRange: [number, number] = [0, votes]

  const [tempRatingRange, setTempRatingRange] = useState<[number, number]>([0, rating])
  const [tempVoteCountRange, setTempVoteCountRange] = useState<[number, number]>([0, votes])

  // Sync temp when committed value changes (e.g. filter switched to custom, seeding defaults)
  useEffect(() => setTempRatingRange([0, rating]), [rating])
  useEffect(() => setTempVoteCountRange([0, votes]), [votes])

  const setFilter = (val: DiscoverFilterMode) => {
    setDiscoverFilter(val)
    if (val === "custom") {
      const rec = COUNTRY_DEFAULTS[isoA2 ?? ""] ?? GLOBAL_DEFAULTS
      setRating(rec.rating)
      setVotes(rec.voteCount)
    }
  }

  return (
    <div className="flex flex-col items-center gap-0 mb-7">
      <Toggle<DiscoverSort>
        label="Sort By"
        value={dsort}
        onChange={setDsort}
        options={[
          { value: "random", label: "Random" },
          { value: "vote_average.desc", label: "Top Rated" },
          { value: "vote_count.desc", label: "Most Voted" },
        ]}
      />

      <ToggleWithSlider<DiscoverFilterMode>
        label="Filter"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "recommended", label: "Recommended" },
          { value: "custom", label: "Custom" },
        ]}
        ratingRange={ratingRange}
        setRatingRange={(val) => setRating(val[1])}
        tempRatingRange={tempRatingRange}
        setTempRatingRange={setTempRatingRange}
        voteCountRange={voteCountRange}
        setVoteCountRange={(val) => setVotes(val[1])}
        tempVoteCountRange={tempVoteCountRange}
        setTempVoteCountRange={setTempVoteCountRange}
      />
    </div>
  )
}
