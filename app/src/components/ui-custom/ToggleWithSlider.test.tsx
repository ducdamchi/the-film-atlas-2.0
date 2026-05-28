import { render, screen, fireEvent } from "@testing-library/react"
import ToggleWithSlider from "./ToggleWithSlider"

vi.mock("./CustomSlider", () => ({
  default: ({ id }: { id?: string }) => <div data-testid={`slider-${id}`} />,
}))

const filterOptions = [
  { value: "recommended", label: "Recommended" },
  { value: "custom", label: "Custom" },
]

const noop = () => {}

const customProps = {
  ratingRange: [0, 7] as [number, number],
  tempRatingRange: [0, 7] as [number, number],
  setTempRatingRange: noop,
  setRatingRange: noop,
  voteCountRange: [0, 200] as [number, number],
  tempVoteCountRange: [0, 200] as [number, number],
  setTempVoteCountRange: noop,
  setVoteCountRange: noop,
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("ToggleWithSlider — rendering", () => {
  it("renders a button for each option", () => {
    render(
      <ToggleWithSlider options={filterOptions} value="recommended" onChange={noop} />
    )
    expect(screen.getByRole("button", { name: "Recommended" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Custom" })).toBeTruthy()
  })

  it("renders the label when provided", () => {
    render(
      <ToggleWithSlider
        options={filterOptions}
        value="recommended"
        onChange={noop}
        label="Filter"
      />
    )
    expect(screen.getByText("Filter")).toBeTruthy()
  })

  it("does not render a label element when label is omitted", () => {
    render(
      <ToggleWithSlider options={filterOptions} value="recommended" onChange={noop} />
    )
    expect(screen.queryByText(/filter/i)).toBeNull()
  })
})

// ─── Custom panel visibility ───────────────────────────────────────────────────

describe("ToggleWithSlider — custom panel", () => {
  it("hides the slider panel when value is not 'custom'", () => {
    render(
      <ToggleWithSlider
        options={filterOptions}
        value="recommended"
        onChange={noop}
        {...customProps}
      />
    )
    expect(screen.queryByText(/average rating/i)).toBeNull()
    expect(screen.queryByText(/vote count/i)).toBeNull()
  })

  it("shows the slider panel when value is 'custom'", () => {
    render(
      <ToggleWithSlider
        options={filterOptions}
        value="custom"
        onChange={noop}
        {...customProps}
      />
    )
    expect(screen.getByText(/average rating/i)).toBeTruthy()
    expect(screen.getByText(/vote count/i)).toBeTruthy()
  })

  it("displays the tempRatingRange value in the panel label", () => {
    render(
      <ToggleWithSlider
        options={filterOptions}
        value="custom"
        onChange={noop}
        {...customProps}
        tempRatingRange={[0, 6.5]}
        tempVoteCountRange={[0, 80]}
      />
    )
    expect(screen.getByText(/6\.5/)).toBeTruthy()
    expect(screen.getByText(/80/)).toBeTruthy()
  })

  it("renders two CustomSlider instances when value is 'custom'", () => {
    render(
      <ToggleWithSlider
        options={filterOptions}
        value="custom"
        onChange={noop}
        {...customProps}
      />
    )
    expect(screen.getAllByTestId(/slider-/)).toHaveLength(2)
  })
})

// ─── Active state ─────────────────────────────────────────────────────────────

describe("ToggleWithSlider — active state", () => {
  it("applies active class to the button matching value", () => {
    render(
      <ToggleWithSlider options={filterOptions} value="recommended" onChange={noop} />
    )
    expect(
      screen.getByRole("button", { name: "Recommended" }).className
    ).toContain("font-semibold")
    expect(
      screen.getByRole("button", { name: "Custom" }).className
    ).not.toContain("font-semibold")
  })

  it("shifts the active class when value prop changes", () => {
    const { rerender } = render(
      <ToggleWithSlider options={filterOptions} value="recommended" onChange={noop} />
    )
    rerender(
      <ToggleWithSlider options={filterOptions} value="custom" onChange={noop} />
    )
    expect(
      screen.getByRole("button", { name: "Custom" }).className
    ).toContain("font-semibold")
    expect(
      screen.getByRole("button", { name: "Recommended" }).className
    ).not.toContain("font-semibold")
  })
})

// ─── Slider styles ────────────────────────────────────────────────────────────

describe("ToggleWithSlider — slider styles", () => {
  function getSlider(container: HTMLElement) {
    return container.querySelector<HTMLElement>(".absolute.bg-foreground")!
  }

  it("sets slider width to 50% for 2 options", () => {
    const { container } = render(
      <ToggleWithSlider options={filterOptions} value="recommended" onChange={noop} />
    )
    expect(getSlider(container).style.width).toBe("50%")
  })

  it("positions slider at index 0 when first option is active", () => {
    const { container } = render(
      <ToggleWithSlider options={filterOptions} value="recommended" onChange={noop} />
    )
    expect(getSlider(container).style.transform).toBe("translateX(0%)")
  })

  it("positions slider at index 1 when second option is active", () => {
    const { container } = render(
      <ToggleWithSlider options={filterOptions} value="custom" onChange={noop} />
    )
    expect(getSlider(container).style.transform).toBe("translateX(100%)")
  })
})

// ─── Interaction ──────────────────────────────────────────────────────────────

describe("ToggleWithSlider — interaction", () => {
  it("calls onChange with the correct value when a button is clicked", () => {
    const onChange = vi.fn()
    render(
      <ToggleWithSlider options={filterOptions} value="recommended" onChange={onChange} />
    )
    fireEvent.click(screen.getByRole("button", { name: "Custom" }))
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith("custom")
  })

  it("applies active class to clicked button immediately (optimistic UI)", () => {
    // value stays "recommended" — onChange is a noop — pendingIndex drives the class
    render(
      <ToggleWithSlider options={filterOptions} value="recommended" onChange={noop} />
    )
    fireEvent.click(screen.getByRole("button", { name: "Custom" }))
    expect(
      screen.getByRole("button", { name: "Custom" }).className
    ).toContain("font-semibold")
  })

  it("clears optimistic state once the value prop catches up", () => {
    const { rerender } = render(
      <ToggleWithSlider options={filterOptions} value="recommended" onChange={noop} />
    )
    fireEvent.click(screen.getByRole("button", { name: "Custom" }))
    rerender(
      <ToggleWithSlider options={filterOptions} value="custom" onChange={noop} />
    )
    expect(
      screen.getByRole("button", { name: "Custom" }).className
    ).toContain("font-semibold")
    expect(
      screen.getByRole("button", { name: "Recommended" }).className
    ).not.toContain("font-semibold")
  })
})
