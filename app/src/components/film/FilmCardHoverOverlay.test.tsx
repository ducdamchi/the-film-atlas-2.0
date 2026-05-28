import { render, screen, fireEvent } from "@testing-library/react"
import CardHoverOverlay from "./FilmCardHoverOverlay"
import { makeTmdbSummary, makeMovieDetails, makeDirector } from "./__fixtures__/film"
import type { TMDBFilm } from "@/types/tmdb"

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("./InteractionConsole", () => ({
  default: () => <div data-testid="interaction-console" />,
}))

vi.mock("@/components/ui-custom/SkeletonBlock", () => ({
  default: () => <div data-testid="skeleton-block" />,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const filmObject = makeTmdbSummary()
const directors = [makeDirector()]

const baseProps = {
  hoverId: null,
  filmObject,
  directors,
  movieDetails: {} as Record<string, never>,
  isLoading: false,
  fetchError: false,
  slideDown: true,
}

beforeEach(() => mockNavigate.mockClear())

// ─── slideDown=false (fallback path) ──────────────────────────────────────────

describe("CardHoverOverlay — slideDown=false", () => {
  it("renders nothing when slideDown is false", () => {
    const { container } = render(<CardHoverOverlay {...baseProps} slideDown={false} />)
    expect(container.firstElementChild).toBeNull()
  })
})

// ─── Fetch error ──────────────────────────────────────────────────────────────

describe("CardHoverOverlay — fetch error", () => {
  it("shows 'Details unavailable.' when fetchError=true", () => {
    render(<CardHoverOverlay {...baseProps} fetchError={true} />)
    expect(screen.getByText(/Details unavailable/)).toBeTruthy()
  })

  it("does not show runtime or language text when fetchError=true", () => {
    render(
      <CardHoverOverlay {...baseProps} fetchError={true} movieDetails={makeMovieDetails()} />,
    )
    expect(screen.queryByText(/88 min/)).toBeNull()
    expect(screen.queryByText("Japanese")).toBeNull()
  })

  it("does not show skeleton blocks when fetchError=true", () => {
    render(<CardHoverOverlay {...baseProps} fetchError={true} isLoading={true} />)
    expect(screen.queryByTestId("skeleton-block")).toBeNull()
  })
})

// ─── Loading state ────────────────────────────────────────────────────────────

describe("CardHoverOverlay — loading state", () => {
  it("renders skeleton blocks while loading", () => {
    render(<CardHoverOverlay {...baseProps} isLoading={true} />)
    // 1 skeleton for the original_title slot + 2 for the runtime/language pair = 3
    expect(screen.getAllByTestId("skeleton-block")).toHaveLength(3)
  })

  it("does not render runtime text while loading", () => {
    render(<CardHoverOverlay {...baseProps} isLoading={true} movieDetails={makeMovieDetails()} />)
    expect(screen.queryByText(/88 min/)).toBeNull()
  })

  it("does not render language text while loading", () => {
    render(<CardHoverOverlay {...baseProps} isLoading={true} movieDetails={makeMovieDetails()} />)
    expect(screen.queryByText("Japanese")).toBeNull()
  })

  it("still renders overview text while loading (not behind isLoading guard)", () => {
    render(<CardHoverOverlay {...baseProps} isLoading={true} />)
    expect(screen.getByText(filmObject.overview)).toBeTruthy()
  })
})

// ─── Loaded state ─────────────────────────────────────────────────────────────

describe("CardHoverOverlay — loaded state", () => {
  it("renders overview from filmObject when movieDetails is empty", () => {
    render(<CardHoverOverlay {...baseProps} movieDetails={{}} />)
    expect(screen.getByText(filmObject.overview)).toBeTruthy()
  })

  it("renders original_title when it differs from filmObject.title", () => {
    // filmObject.title = "Rashomon", original_title = "Rashōmon" → different → shown
    render(<CardHoverOverlay {...baseProps} movieDetails={makeMovieDetails()} />)
    expect(screen.getByText("Rashōmon")).toBeTruthy()
  })

  it("does not render original_title when it matches filmObject.title", () => {
    // filmObject.title = "Rashomon", original_title = "Rashomon" → same → hidden
    render(
      <CardHoverOverlay
        {...baseProps}
        movieDetails={makeMovieDetails({ original_title: "Rashomon" })}
      />,
    )
    // "Rashomon" does not appear anywhere in this overlay (not in overview text)
    expect(screen.queryByText("Rashomon")).toBeNull()
  })

  it("renders runtime in minutes", () => {
    render(<CardHoverOverlay {...baseProps} movieDetails={makeMovieDetails()} />)
    expect(screen.getByText("88 min")).toBeTruthy()
  })

  it("does not render runtime when movieDetails.runtime is null", () => {
    render(
      <CardHoverOverlay
        {...baseProps}
        movieDetails={makeMovieDetails({ runtime: null } as Partial<TMDBFilm>)}
      />,
    )
    expect(screen.queryByText(/min/)).toBeNull()
  })

  it("renders spoken language names joined by comma", () => {
    render(
      <CardHoverOverlay
        {...baseProps}
        movieDetails={makeMovieDetails({
          spoken_languages: [
            { iso_639_1: "ja", name: "日本語", english_name: "Japanese" },
            { iso_639_1: "en", name: "English", english_name: "English" },
          ],
        })}
      />,
    )
    expect(screen.getByText("Japanese, English")).toBeTruthy()
  })

  it("renders the InteractionConsole", () => {
    render(<CardHoverOverlay {...baseProps} />)
    expect(screen.getByTestId("interaction-console")).toBeTruthy()
  })
})

// ─── Navigation ───────────────────────────────────────────────────────────────

describe("CardHoverOverlay — navigation", () => {
  it("clicking the content area calls navigate to /films/{id}", () => {
    render(<CardHoverOverlay {...baseProps} />)
    // The overview span is a direct child of the clickable div — click it to trigger handleNavigate
    fireEvent.click(screen.getByText(filmObject.overview))
    expect(mockNavigate).toHaveBeenCalledWith({ to: `/films/${filmObject.id}` })
  })

  it("calls setPage with loadMore: false when provided", () => {
    const setPage = vi.fn()
    render(<CardHoverOverlay {...baseProps} setPage={setPage} />)
    fireEvent.click(screen.getByText(filmObject.overview))
    expect(setPage).toHaveBeenCalledOnce()
    // setPage is called with an updater function: (prev) => ({ ...prev, loadMore: false })
    const updater = setPage.mock.calls[0][0]
    expect(updater({ loadMore: true, page: 1 })).toEqual({ loadMore: false, page: 1 })
  })
})
