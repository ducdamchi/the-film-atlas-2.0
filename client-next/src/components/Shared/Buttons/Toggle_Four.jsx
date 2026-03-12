import { useState, useEffect } from "react"

export default function Toggle_Four({
  state,
  setState,
  stateDetails,
  width,
  height,
  label,
}) {
  const [activeOption, setActiveOption] = useState(1)

  const getSliderTransform = () => {
    // Each option occupies 33.333% of the container
    // We move the slider by multiples of 33.333%
    const transforms = {
      1: "translate-x-0",
      2: "translate-x-[100%]",
      3: "translate-x-[200%]",
      4: "translate-x-[300%]",
    }
    return transforms[activeOption]
  }

  useEffect(() => {
    if (state === stateDetails[1].value) {
      setActiveOption(1)
    } else if (state === stateDetails[2].value) {
      setActiveOption(2)
    } else if (state === stateDetails[3].value) {
      setActiveOption(3)
    } else if (state === stateDetails[4].value) {
      setActiveOption(4)
    }
  }, [state])

  return (
    <div className="toggleButton-whole">
      <div className="toggleButton-label">{label}</div>
      <div className={`toggleButton-buttonsContainer`}>
        <div className="relative flex w-full h-full">
          {/* Slider background */}
          <div className={`toggleButton-bg w-1/4 ${getSliderTransform()}`} />

          {/* Options */}
          <button
            onClick={() => {
              setActiveOption(1)
              setState(stateDetails[1].value)
            }}
            className={`toggleButton-button ${
              activeOption === 1 ? "toggleButton-buttonActive" : ""
            }`}>
            {stateDetails[1].label}
          </button>
          <button
            onClick={() => {
              setActiveOption(2)
              setState(stateDetails[2].value)
            }}
            className={`toggleButton-button ${
              activeOption === 2 ? "toggleButton-buttonActive" : ""
            }`}>
            {stateDetails[2].label}
          </button>
          <button
            onClick={() => {
              setActiveOption(3)
              setState(stateDetails[3].value)
            }}
            className={`toggleButton-button ${
              activeOption === 3 ? "toggleButton-buttonActive" : ""
            }`}>
            {stateDetails[3].label}
          </button>
          <button
            onClick={() => {
              setActiveOption(4)
              setState(stateDetails[4].value)
            }}
            className={`toggleButton-button ${
              activeOption === 4 ? "toggleButton-buttonActive" : ""
            }`}>
            {stateDetails[4].label}
          </button>
        </div>
      </div>
    </div>
  )
}
