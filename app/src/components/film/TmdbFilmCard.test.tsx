import { render, screen, fireEvent } from "@testing-library/react"
import TmdbFilmCard from "./TmdbFilmCard"
import { makeTmdbSummary } from "./__fixtures__/film"

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("@/hooks/useFilmCardFetch", () => ({
  useFilmCardFetch: () => ({
    isLoading: false,
    fetchError: false,
    movieDetails: {},
    directors: [],
    handleCardHoverEnter: vi.fn(),
    handleCardHoverLeave: vi.fn(),
  }),
}))

vi.mock("@/hooks/useMarquee", () => ({
  useMarquee: () => ({ current: null }),
}))

vi.mock("./FilmCardPoster", () => ({
  default: ({ onNavigate }: { onNavigate: () => void }) => (
    <div data-testid="film-card-poster" onClick={onNavigate} />
  ),
}))

vi.mock("./FilmCardHoverOverlay", () => ({
  default: () => <div data-testid="card-hover-overlay" />,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const film = makeTmdbSummary() // id=202, title="Rashomon", release_date="1950-08-25", vote_average=8.2, vote_count=4100

beforeEach(() => mockNavigate.mockClear())

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("TmdbFilmCard — rendering", () => {
  it("renders film title", () => {
    render(<TmdbFilmCard filmObject={film} imgRef={vi.fn()} />)
    expect(screen.getByText("Rashomon")).toBeTruthy()
  })

  it("renders release year derived from release_date", () => {
    render(<TmdbFilmCard filmObject={film} imgRef={vi.fn()} />)
    expect(screen.getByText("1950")).toBeTruthy()
  })

  it("renders vote_average formatted to 1 decimal place", () => {
    render(<TmdbFilmCard filmObject={film} imgRef={vi.fn()} />)
    expect(screen.getByText("8.2")).toBeTruthy()
  })

  it("renders vote_count", () => {
    render(<TmdbFilmCard filmObject={film} imgRef={vi.fn()} />)
    expect(screen.getByText("4100")).toBeTruthy()
  })

  it("renders FilmCardPoster", () => {
    render(<TmdbFilmCard filmObject={film} imgRef={vi.fn()} />)
    expect(screen.getByTestId("film-card-poster")).toBeTruthy()
  })

  it("renders FilmCardHoverOverlay", () => {
    render(<TmdbFilmCard filmObject={film} imgRef={vi.fn()} />)
    expect(screen.getByTestId("card-hover-overlay")).toBeTruthy()
  })

  it("card root div has id film-card-{filmObject.id}", () => {
    const { container } = render(<TmdbFilmCard filmObject={film} imgRef={vi.fn()} />)
    expect(container.querySelector(`#film-card-${film.id}`)).toBeTruthy()
  })

  it("does not render year span when release_date is empty string", () => {
    const noDate = makeTmdbSummary({ release_date: "" })
    render(<TmdbFilmCard filmObject={noDate} imgRef={vi.fn()} />)
    expect(screen.queryByText("1950")).toBeNull()
  })
})

// ─── Navigation ───────────────────────────────────────────────────────────────

describe("TmdbFilmCard — navigation", () => {
  it("clicking FilmCardPoster triggers navigate to /films/{id}", () => {
    render(<TmdbFilmCard filmObject={film} imgRef={vi.fn()} />)
    fireEvent.click(screen.getByTestId("film-card-poster"))
    expect(mockNavigate).toHaveBeenCalledWith({ to: `/films/${film.id}` })
  })

  it("clicking title span triggers navigate to /films/{id}", () => {
    render(<TmdbFilmCard filmObject={film} imgRef={vi.fn()} />)
    fireEvent.click(screen.getByText(film.title))
    expect(mockNavigate).toHaveBeenCalledWith({ to: `/films/${film.id}` })
  })

  it("when setPage is provided, clicking poster also calls setPage with loadMore: false", () => {
    const setPage = vi.fn()
    render(<TmdbFilmCard filmObject={film} imgRef={vi.fn()} setPage={setPage as any} />)
    fireEvent.click(screen.getByTestId("film-card-poster"))
    expect(setPage).toHaveBeenCalledOnce()
    const updater = setPage.mock.calls[0][0]
    expect(updater({ loadMore: true, page: 1 })).toEqual({ loadMore: false, page: 1 })
  })
})
