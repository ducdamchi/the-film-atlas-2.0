import { render, screen, fireEvent, act } from "@testing-library/react"
import { TripleStarRating } from "./InteractionConsole"
import type { StarRating } from "@/types/film"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderRating(
  officialRating: StarRating | null,
  showText: boolean,
  setRequestedRating = vi.fn(),
) {
  const { container } = render(
    <TripleStarRating
      officialRating={officialRating}
      setRequestedRating={setRequestedRating}
      showText={showText}
    />,
  )
  // The outer div owns onMouseEnter/onMouseLeave for the isHovered state
  const wrapper = container.firstElementChild!
  return { container, wrapper, setRequestedRating }
}

// ─── Rendering — card mode (showText=false) ───────────────────────────────────

describe("TripleStarRating — rendering (card mode)", () => {
  it("renders exactly 3 star buttons when unrated", () => {
    renderRating(null, false)
    expect(screen.getAllByRole("button")).toHaveLength(3)
  })

  it("does not render 'Rate' or 'Unrate' text", () => {
    renderRating(null, false)
    expect(screen.queryByText("Rate")).toBeNull()
    expect(screen.queryByText("Unrate")).toBeNull()
  })

  it("does not render the × clear button when not hovered", () => {
    renderRating(2, false)
    expect(screen.queryByText("✕")).toBeNull()
  })
})

// ─── Rendering — landing mode (showText=true) ─────────────────────────────────

describe("TripleStarRating — rendering (landing mode)", () => {
  it("shows 'Rate' span when officialRating is null", () => {
    renderRating(null, true)
    expect(screen.getByText("Rate")).toBeTruthy()
  })

  it("shows 'Rate' span when officialRating is 0", () => {
    renderRating(0, true)
    expect(screen.getByText("Rate")).toBeTruthy()
  })

  it("shows 'Unrate' button when officialRating is 1", () => {
    renderRating(1, true)
    expect(screen.getByRole("button", { name: "Unrate" })).toBeTruthy()
  })

  it("shows 'Unrate' button when officialRating is 3", () => {
    renderRating(3, true)
    expect(screen.getByRole("button", { name: "Unrate" })).toBeTruthy()
  })

  it("does not show 'Unrate' when officialRating is 0", () => {
    renderRating(0, true)
    expect(screen.queryByRole("button", { name: "Unrate" })).toBeNull()
  })
})

// ─── Click callbacks — card mode ─────────────────────────────────────────────

describe("TripleStarRating — click callbacks (card mode)", () => {
  it("clicking star 1 calls setRequestedRating(1) when unrated", () => {
    const fn = vi.fn()
    renderRating(null, false, fn)
    fireEvent.click(screen.getAllByRole("button")[0])
    expect(fn).toHaveBeenCalledWith(1)
  })

  it("clicking star 2 calls setRequestedRating(2) when unrated", () => {
    const fn = vi.fn()
    renderRating(null, false, fn)
    fireEvent.click(screen.getAllByRole("button")[1])
    expect(fn).toHaveBeenCalledWith(2)
  })

  it("clicking star 3 calls setRequestedRating(3) when unrated", () => {
    const fn = vi.fn()
    renderRating(null, false, fn)
    fireEvent.click(screen.getAllByRole("button")[2])
    expect(fn).toHaveBeenCalledWith(3)
  })

  it("clicking the already-active star toggles it off (calls setRequestedRating(0))", () => {
    const fn = vi.fn()
    renderRating(2, false, fn)
    // star 2 is at index 1
    fireEvent.click(screen.getAllByRole("button")[1])
    expect(fn).toHaveBeenCalledWith(0)
  })

  it("clicking a different star does not toggle off", () => {
    const fn = vi.fn()
    renderRating(2, false, fn)
    // star 1 (index 0) is not the active star
    fireEvent.click(screen.getAllByRole("button")[0])
    expect(fn).toHaveBeenCalledWith(1)
  })
})

// ─── Click callbacks — landing mode ──────────────────────────────────────────

describe("TripleStarRating — click callbacks (landing mode)", () => {
  it("clicking the active star does NOT toggle off (always passes the value)", () => {
    const fn = vi.fn()
    renderRating(2, true, fn)
    // In landing mode: `!showText && officialRating === 2 ? 0 : 2` → showText=true so !showText=false → always 2
    const starButtons = screen.getAllByRole("button").filter((b) => b.textContent !== "Unrate")
    fireEvent.click(starButtons[1]) // star 2 (index 1)
    expect(fn).toHaveBeenCalledWith(2)
  })

  it("'Unrate' button calls setRequestedRating(0)", () => {
    const fn = vi.fn()
    renderRating(2, true, fn)
    fireEvent.click(screen.getByRole("button", { name: "Unrate" }))
    expect(fn).toHaveBeenCalledWith(0)
  })
})

// ─── Hover — × clear button ───────────────────────────────────────────────────

describe("TripleStarRating — hover clear button", () => {
  it("shows × button on mouseEnter when officialRating >= 1 (card mode)", () => {
    const { wrapper } = renderRating(2, false)
    fireEvent.mouseEnter(wrapper)
    expect(screen.getByText("✕")).toBeTruthy()
  })

  it("× button click calls setRequestedRating(0)", () => {
    const fn = vi.fn()
    const { wrapper } = renderRating(1, false, fn)
    fireEvent.mouseEnter(wrapper)
    fireEvent.click(screen.getByText("✕"))
    expect(fn).toHaveBeenCalledWith(0)
  })

  it("does not show × button on mouseEnter when officialRating is null", () => {
    const { wrapper } = renderRating(null, false)
    fireEvent.mouseEnter(wrapper)
    expect(screen.queryByText("✕")).toBeNull()
  })

  it("does not show × button in landing mode (showText=true)", () => {
    const { wrapper } = renderRating(2, true)
    fireEvent.mouseEnter(wrapper)
    expect(screen.queryByText("✕")).toBeNull()
  })

  it("× button disappears after mouseLeave debounce (200ms)", () => {
    vi.useFakeTimers()
    const { wrapper } = renderRating(1, false)
    fireEvent.mouseEnter(wrapper)
    expect(screen.getByText("✕")).toBeTruthy()

    fireEvent.mouseLeave(wrapper)
    act(() => vi.advanceTimersByTime(200))
    expect(screen.queryByText("✕")).toBeNull()
    vi.useRealTimers()
  })
})
