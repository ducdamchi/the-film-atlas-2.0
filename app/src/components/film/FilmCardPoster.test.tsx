import { render, fireEvent, act } from "@testing-library/react"
import FilmCardPoster from "./FilmCardPoster"

// VITE_TMDB_IMG_URL is read at module level in FilmCardPoster.tsx.
// Its value ("https://image.tmdb.org/t/p/w500") is set in app/.env.test,
// which Vitest loads automatically in test mode.

// ─── Helpers ──────────────────────────────────────────────────────────────────

const baseProps = {
  backdropPath: "/backdrop.jpg" as string | null,
  filmId: 101,
  trailerKey: null as string | null,
  onPosterHoverEnter: vi.fn(),
  onPosterHoverLeave: vi.fn(),
  onNavigate: vi.fn(),
}

function getImg(container: HTMLElement) {
  return container.querySelector("img")!
}

function getOuter(container: HTMLElement) {
  return container.firstElementChild!
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

// ─── Image rendering ──────────────────────────────────────────────────────────

describe("FilmCardPoster — image", () => {
  it("includes backdropPath in the img src", () => {
    const { container } = render(<FilmCardPoster {...baseProps} />)
    expect(getImg(container).getAttribute("src")).toContain("/backdrop.jpg")
  })

  it("uses the fallback src when backdropPath is null", () => {
    const { container } = render(<FilmCardPoster {...baseProps} backdropPath={null} />)
    expect(getImg(container).getAttribute("src")).toBe("backdropnotfound.jpg")
  })

  it("sets img id to thumbnail-{filmId}", () => {
    const { container } = render(<FilmCardPoster {...baseProps} />)
    expect(getImg(container).id).toBe("thumbnail-101")
  })
})

// ─── Callbacks ────────────────────────────────────────────────────────────────

describe("FilmCardPoster — callbacks", () => {
  it("onClick fires onNavigate", () => {
    const onNavigate = vi.fn()
    const { container } = render(<FilmCardPoster {...baseProps} onNavigate={onNavigate} />)
    fireEvent.click(getOuter(container))
    expect(onNavigate).toHaveBeenCalledOnce()
  })

  it("onMouseEnter fires onPosterHoverEnter", () => {
    const fn = vi.fn()
    const { container } = render(<FilmCardPoster {...baseProps} onPosterHoverEnter={fn} />)
    fireEvent.mouseEnter(getOuter(container))
    expect(fn).toHaveBeenCalledOnce()
  })

  it("onMouseLeave fires onPosterHoverLeave", () => {
    const fn = vi.fn()
    const { container } = render(<FilmCardPoster {...baseProps} onPosterHoverLeave={fn} />)
    fireEvent.mouseLeave(getOuter(container))
    expect(fn).toHaveBeenCalledOnce()
  })

  it("fires onImageLoad when the img load event fires", () => {
    const fn = vi.fn()
    const { container } = render(<FilmCardPoster {...baseProps} onImageLoad={fn} />)
    fireEvent.load(getImg(container))
    expect(fn).toHaveBeenCalledOnce()
  })
})

// ─── Trailer iframe ───────────────────────────────────────────────────────────

describe("FilmCardPoster — trailer iframe", () => {
  it("does not render iframe initially (phase=idle)", () => {
    const { container } = render(<FilmCardPoster {...baseProps} trailerKey="abc123" />)
    expect(container.querySelector("iframe")).toBeNull()
  })

  it("does not render iframe when trailerKey is null (even after hover)", () => {
    const { container } = render(<FilmCardPoster {...baseProps} trailerKey={null} />)
    fireEvent.mouseEnter(getOuter(container))
    act(() => vi.advanceTimersByTime(1300))
    expect(container.querySelector("iframe")).toBeNull()
  })

  it("mounts iframe after 1000ms intent delay when trailerKey is set", () => {
    const { container } = render(<FilmCardPoster {...baseProps} trailerKey="abc123" />)
    fireEvent.mouseEnter(getOuter(container))
    act(() => vi.advanceTimersByTime(1000))
    expect(container.querySelector("iframe")).toBeTruthy()
  })

  it("iframe src contains the trailerKey", () => {
    const { container } = render(<FilmCardPoster {...baseProps} trailerKey="abc123" />)
    fireEvent.mouseEnter(getOuter(container))
    act(() => vi.advanceTimersByTime(1000))
    expect(container.querySelector("iframe")?.src).toContain("abc123")
  })

  it("cancelling hover before 1000ms prevents iframe from mounting", () => {
    const { container } = render(<FilmCardPoster {...baseProps} trailerKey="abc123" />)
    fireEvent.mouseEnter(getOuter(container))
    act(() => vi.advanceTimersByTime(500)) // intent timer not yet fired
    fireEvent.mouseLeave(getOuter(container)) // clears the intent timer
    act(() => vi.advanceTimersByTime(1000)) // nothing fires now
    expect(container.querySelector("iframe")).toBeNull()
  })

  it("iframe is visible (opacity-100) after full 1300ms hover", () => {
    const { container } = render(<FilmCardPoster {...baseProps} trailerKey="abc123" />)
    fireEvent.mouseEnter(getOuter(container))
    act(() => vi.advanceTimersByTime(1000)) // → dimming (iframe mounts, opacity-0)
    act(() => vi.advanceTimersByTime(300))  // → playing (opacity-100)
    expect(container.querySelector("iframe")?.className).toContain("opacity-100")
  })
})
