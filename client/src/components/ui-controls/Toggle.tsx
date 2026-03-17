import { useState, useEffect } from "react"

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
}

/**
 * Generic sliding-tab toggle button.
 * Slider width = 100% / options.length; translates by index * 100%.
 */
export default function Toggle<T>({
  options,
  value,
  onChange,
  label,
  allowNoSelection = false,
}: ToggleProps<T>) {
  const [activeIndex, setActiveIndex] = useState<number>(-1)

  useEffect(() => {
    const idx = options.findIndex((opt) => opt.value === value)
    setActiveIndex(idx)
  }, [value, options])

  const sliderVisible = !allowNoSelection || activeIndex !== -1
  const sliderWidth = `${100 / options.length}%`
  const sliderTranslate =
    activeIndex >= 0 ? `translateX(${activeIndex * 100}%)` : "translateX(0)"

  return (
    <div className="toggleButton-whole">
      {label && <div className="toggleButton-label">{label}</div>}
      <div className="toggleButton-buttonsContainer">
        <div className="relative flex w-full h-full">
          {/* Slider background */}
          <div
            className={`toggleButton-bg transition-transform duration-200 ease-out ${sliderVisible ? "" : "invisible"}`}
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
                setActiveIndex(idx)
                onChange(opt.value)
              }}
              className={`toggleButton-button ${activeIndex === idx ? "toggleButton-buttonActive" : ""}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
