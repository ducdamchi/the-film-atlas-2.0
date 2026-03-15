import React from "react"
import RangeSlider from "react-range-slider-input"
import "react-range-slider-input/dist/style.css"
import "../../../App.css"

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
}) {
  return (
    <div className={`w-[${width}] flex items-center justify-center gap-2`}>
      <div className="text-xs font-semibold text-gray-600">{min}</div>
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
          onInput={(value, userInteraction) => {
            setTempRange([value[0], value[1]])
          }}
          onThumbDragEnd={() => setRange([tempRange[0], tempRange[1]])}
          onRangeDragEnd={() => setRange([tempRange[0], tempRange[1]])}
        />
      </div>
      <div className="text-xs font-semibold text-gray-600">{max}</div>
    </div>
  )
}
