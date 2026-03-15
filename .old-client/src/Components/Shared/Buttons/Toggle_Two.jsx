import { useState, useEffect } from "react"

export default function Toggle_Two({
  state,
  setState,
  stateDetails,
  width,
  height,
  label,
}) {
  const [activeOption, setActiveOption] = useState(1)

  const getSliderTransform = () => {
    // Each option occupies 50% of the container
    // We move the slider by multiples of 50%
    const transforms = {
      1: "translate-x-0",
      2: "translate-x-[100%]",
    }
    return transforms[activeOption]
  }

  useEffect(() => {
    if (state === stateDetails[1].value) {
      setActiveOption(1)
    } else if (state === stateDetails[2].value) {
      setActiveOption(2)
    }
  }, [state])

  return (
    <div className="toggleButton-whole">
      <div className="toggleButton-label">{label}</div>
      <div className="toggleButton-buttonsContainer">
        <div className="relative flex h-full w-full">
          {/* Slider background */}
          <div className={`toggleButton-bg w-1/2 ${getSliderTransform()}`} />

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
        </div>
      </div>
    </div>
  )
}
