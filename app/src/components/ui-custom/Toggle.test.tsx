import { render, screen, fireEvent } from "@testing-library/react"
import Toggle from "./Toggle"

// Reusable options shared across tests
const binaryOptions = [
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B" },
]

const ternaryOptions = [
  { value: "x", label: "X" },
  { value: "y", label: "Y" },
  { value: "z", label: "Z" },
]

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("Toggle — rendering", () => {
  it("renders a button for each option", () => {
    render(<Toggle options={binaryOptions} value="a" onChange={() => {}} />)
    expect(screen.getByRole("button", { name: "Option A" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Option B" })).toBeTruthy()
  })

  it("renders the label when provided", () => {
    render(
      <Toggle options={binaryOptions} value="a" onChange={() => {}} label="Browse" />
    )
    // `uppercase` is a CSS class — jsdom doesn't apply it, so DOM text is still "Browse"
    expect(screen.getByText("Browse")).toBeTruthy()
  })

  it("does not render a label element when label is omitted", () => {
    render(<Toggle options={binaryOptions} value="a" onChange={() => {}} />)
    // Neither option label equals a standalone label string
    expect(screen.queryByText(/browse/i)).toBeNull()
  })
})

// ─── Active state ─────────────────────────────────────────────────────────────

describe("Toggle — active state", () => {
  it("applies active class to the button matching value", () => {
    render(<Toggle options={binaryOptions} value="a" onChange={() => {}} />)
    const activeBtn = screen.getByRole("button", { name: "Option A" })
    const inactiveBtn = screen.getByRole("button", { name: "Option B" })
    expect(activeBtn.className).toContain("font-semibold")
    expect(inactiveBtn.className).not.toContain("font-semibold")
  })

  it("shifts the active class when value prop changes", () => {
    const { rerender } = render(
      <Toggle options={binaryOptions} value="a" onChange={() => {}} />
    )
    rerender(<Toggle options={binaryOptions} value="b" onChange={() => {}} />)
    const btnA = screen.getByRole("button", { name: "Option A" })
    const btnB = screen.getByRole("button", { name: "Option B" })
    expect(btnB.className).toContain("font-semibold")
    expect(btnA.className).not.toContain("font-semibold")
  })
})

// ─── Slider styles ────────────────────────────────────────────────────────────

describe("Toggle — slider styles", () => {
  function getSlider(container: HTMLElement) {
    // The slider is the first absolute-positioned div inside the inner wrapper
    return container.querySelector<HTMLElement>(".absolute.h-full")!
  }

  it("sets slider width to 50% for 2 options", () => {
    const { container } = render(
      <Toggle options={binaryOptions} value="a" onChange={() => {}} />
    )
    expect(getSlider(container).style.width).toBe("50%")
  })

  it("sets slider width to ~33% for 3 options", () => {
    const { container } = render(
      <Toggle options={ternaryOptions} value="x" onChange={() => {}} />
    )
    expect(getSlider(container).style.width).toBe(`${100 / 3}%`)
  })

  it("positions slider at index 0 when first option is active", () => {
    const { container } = render(
      <Toggle options={binaryOptions} value="a" onChange={() => {}} />
    )
    expect(getSlider(container).style.transform).toBe("translateX(0%)")
  })

  it("positions slider at index 1 when second option is active", () => {
    const { container } = render(
      <Toggle options={binaryOptions} value="b" onChange={() => {}} />
    )
    expect(getSlider(container).style.transform).toBe("translateX(100%)")
  })

  it("positions slider at index 2 when third option is active", () => {
    const { container } = render(
      <Toggle options={ternaryOptions} value="z" onChange={() => {}} />
    )
    expect(getSlider(container).style.transform).toBe("translateX(200%)")
  })
})

// ─── Interaction ──────────────────────────────────────────────────────────────

describe("Toggle — interaction", () => {
  it("calls onChange with the correct value when a button is clicked", () => {
    const onChange = vi.fn()
    render(<Toggle options={binaryOptions} value="a" onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "Option B" }))
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith("b")
  })

  it("calls onChange even when clicking the already-active option", () => {
    const onChange = vi.fn()
    render(<Toggle options={binaryOptions} value="a" onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "Option A" }))
    expect(onChange).toHaveBeenCalledWith("a")
  })

  it("applies active class to clicked button immediately (optimistic UI)", () => {
    // value stays "a" — onChange doesn't update it — so pendingIndex drives
    // the active class on "Option B" right after the click.
    render(<Toggle options={binaryOptions} value="a" onChange={() => {}} />)
    fireEvent.click(screen.getByRole("button", { name: "Option B" }))
    expect(
      screen.getByRole("button", { name: "Option B" }).className
    ).toContain("font-semibold")
  })

  it("clears optimistic state once the value prop catches up", () => {
    const { rerender } = render(
      <Toggle options={binaryOptions} value="a" onChange={() => {}} />
    )
    fireEvent.click(screen.getByRole("button", { name: "Option B" }))
    // Simulate parent updating the controlled value
    rerender(<Toggle options={binaryOptions} value="b" onChange={() => {}} />)
    // pendingIndex should be cleared; button B is active via urlIndex now
    expect(
      screen.getByRole("button", { name: "Option B" }).className
    ).toContain("font-semibold")
    expect(
      screen.getByRole("button", { name: "Option A" }).className
    ).not.toContain("font-semibold")
  })
})
