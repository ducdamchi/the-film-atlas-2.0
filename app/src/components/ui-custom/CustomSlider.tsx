import RangeSlider from "react-range-slider-input"
import "react-range-slider-input/dist/style.css"

interface CustomSliderProps {
  width?: string
  id?: string
  min: number
  max: number
  step?: number
  tempRange: [number, number]
  setTempRange: React.Dispatch<React.SetStateAction<[number, number]>>
  range: [number, number]
  setRange: React.Dispatch<React.SetStateAction<[number, number]>>
  thumbsDisabled?: [boolean, boolean]
  rangeSlideDisabled?: boolean
}

export default function CustomSlider({
  width,
  id,
  min,
  max,
  step,
  tempRange,
  setTempRange,
  range,
  setRange,
  thumbsDisabled,
  rangeSlideDisabled,
}: CustomSliderProps) {
  return (
    <div className={`w-[${width}] flex items-center justify-center gap-2`}>
      <div className="text-xs font-semibold text-label">{min}</div>
      <div className="w-full flex justify-center">
        <RangeSlider
          id={id}
          className="range-slider-rating"
          min={min}
          max={max}
          step={step}
          value={[tempRange[0], tempRange[1]]}
          thumbsDisabled={thumbsDisabled}
          rangeSlideDisabled={rangeSlideDisabled}
          onInput={(value: [number, number]) => {
            setTempRange([value[0], value[1]])
          }}
          onThumbDragEnd={() => setRange([tempRange[0], tempRange[1]])}
          onRangeDragEnd={() => setRange([tempRange[0], tempRange[1]])}
        />
      </div>
      <div className="text-xs font-semibold text-label">{max}</div>
    </div>
  )
}
