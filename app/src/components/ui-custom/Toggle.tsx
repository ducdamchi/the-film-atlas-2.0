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
    <div className="flex flex-col items-center p-2 w-full gap-2 @3xl:flex-row @3xl:justify-center @3xl:gap-5 @3xl:mr-20">
      {label && (
        <div className="w-[7rem] flex self-center mr-45 @3xl:mr-0 @3xl:ml-0 @3xl:justify-end uppercase text-xs @5xl:text-sm">
          {label}
        </div>
      )}
      <div className="relative bg-muted-foreground/10 rounded-none w-[20rem] h-[2.5rem] text-sm @5xl:text-base @5xl:w-[25rem]">
        <div className="relative flex w-full h-full inset-shadow-xs inset-shadow-muted-foreground">
          {/* Slider background */}
          <div
            className={`absolute h-full bg-foreground rounded-none shadow-md transition-all duration-400 ease-in-out   ${sliderVisible ? "" : "invisible"}`}
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
              className={`flex-1 text-center py-2 rounded-none transition-all duration-100 ease-in z-10 flex items-center justify-center ${activeIndex === idx ? "text-background font-semibold" : "text-muted-foreground"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
