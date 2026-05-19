import { useState, useEffect } from "react"
import CustomSlider from "./CustomSlider"

export interface ToggleOption<T> {
  value: T
  label: React.ReactNode
}

export interface ToggleProps<T> {
  options: ToggleOption<T>[]
  value: T
  onChange: (value: T) => void
  label?: string
  /** When true, the slider pill hides if value doesn't match any option */
  allowNoSelection?: boolean
  ratingRange?: [number, number]
  setRatingRange?: (val: [number, number]) => void
  tempRatingRange?: [number, number]
  setTempRatingRange?: (val: [number, number]) => void
  voteCountRange?: [number, number]
  setVoteCountRange?: (val: [number, number]) => void
  tempVoteCountRange?: [number, number]
  setTempVoteCountRange?: (val: [number, number]) => void
}

/**
 * Generic sliding-tab toggle button.
 * Slider width = 100% / options.length; translates by index * 100%.
 */

export default function ToggleWithSlider<T>({
  options,
  value,
  onChange,
  label,
  allowNoSelection = false,
  ratingRange,
  setRatingRange,
  tempRatingRange,
  setTempRatingRange,
  voteCountRange,
  setVoteCountRange,
  tempVoteCountRange,
  setTempVoteCountRange,
}: ToggleProps<T>) {
  const urlIndex = options.findIndex((opt) => opt.value === value)
  const [pendingIndex, setPendingIndex] = useState<number | null>(null)

  useEffect(() => {
    if (pendingIndex !== null && pendingIndex === urlIndex)
      setPendingIndex(null)
  }, [urlIndex, pendingIndex])

  const activeIndex = pendingIndex ?? urlIndex

  const sliderVisible = !allowNoSelection || activeIndex !== -1
  const sliderWidth = `${100 / options.length}%`
  const sliderTranslate =
    activeIndex >= 0 ? `translateX(${activeIndex * 100}%)` : "translateX(0)"

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex flex-col items-center p-2 w-full gap-2 @3xl:flex-row @3xl:justify-center @3xl:gap-5 @3xl:mr-20">
        {label && (
          <div className="w-[7rem] flex self-center mr-45 @3xl:mr-0 @3xl:ml-0 @3xl:justify-end uppercase text-xs @5xl:text-sm">
            {label}
          </div>
        )}
        <div className="relative bg-muted-foreground/10 rounded-none w-[20rem] min-h-[2.5rem] text-sm @5xl:text-base @5xl:w-[25rem] inset-shadow-xs inset-shadow-muted-foreground">
          <div className="relative flex w-full h-[2.5rem]">
            {/* Slider background */}
            <div
              className={`absolute bg-foreground rounded-none shadow-md transition-all duration-400 ease-in-out h-[2.5rem] ${sliderVisible ? "" : "invisible"}`}
              style={{
                width: sliderWidth,
                transform: sliderTranslate,
              }}
            />
            {/* Option buttons */}
            {options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPendingIndex(idx)
                  onChange(opt.value)
                }}
                className={`flex-1 text-center py-2 rounded-none h-[2.5rem] transition-all duration-100 ease-in z-10 flex items-center justify-center ${activeIndex === idx ? "text-background font-semibold" : "text-muted-foreground"}`}>
                {opt.label}
              </button>
            ))}
          </div>
          {(value as string) === "custom" && (
            <div className="flex flex-col items-center justify-center gap-6 p-6 rounded-3xl w-[20rem] text-xs @5xl:text-sm @5xl:w-[25rem] text-muted-foreground">
              <div className="w-full flex flex-col items-center justify-center gap-2 uppercase font-semibold ">
                <div>Average Rating &#x2265; {`${tempRatingRange?.[1]}`}</div>
                <CustomSlider
                  width="15rem"
                  id="slider-simple"
                  min={0}
                  max={10}
                  step={0.1}
                  tempRange={tempRatingRange!}
                  setTempRange={setTempRatingRange!}
                  range={ratingRange!}
                  setRange={setRatingRange!}
                  thumbsDisabled={[true, false]}
                  rangeSlideDisabled={true}
                />
              </div>
              <div className="w-full flex flex-col items-center justify-center gap-2 uppercase font-semibold ">
                <div>Vote Count &#x2265; {`${tempVoteCountRange?.[1]}`}</div>
                <CustomSlider
                  width="15rem"
                  id="slider-simple"
                  min={0}
                  max={500}
                  step={20}
                  tempRange={tempVoteCountRange!}
                  setTempRange={setTempVoteCountRange!}
                  range={voteCountRange!}
                  setRange={setVoteCountRange!}
                  thumbsDisabled={[true, false]}
                  rangeSlideDisabled={true}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
