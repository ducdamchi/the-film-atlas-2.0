import { render, screen } from "@testing-library/react"
import TmdbFilmGallery from "./TmdbFilmGallery"
import { makeTmdbSummary } from "./__fixtures__/film"
import type { TMDBFilmSummary } from "@/types/tmdb"

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("./TmdbFilmCard", () => ({
  default: ({ filmObject }: { filmObject: TMDBFilmSummary }) => (
    <div data-testid={`tmdb-card-${filmObject.id}`} />
  ),
}))

vi.mock("./FilmCardSkeleton", () => ({
  default: () => <div data-testid="film-card-skeleton" />,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const films = [
  makeTmdbSummary({ id: 1 }),
  makeTmdbSummary({ id: 2 }),
  makeTmdbSummary({ id: 3 }),
]

// ─── Loading state ────────────────────────────────────────────────────────────

describe("TmdbFilmGallery — loading state", () => {
  it("renders exactly 8 skeleton cards when isLoading=true", () => {
    render(<TmdbFilmGallery listOfFilmObjects={[]} isLoading={true} />)
    expect(screen.getAllByTestId("film-card-skeleton")).toHaveLength(8)
  })

  it("does NOT render any TmdbFilmCard when isLoading=true", () => {
    render(<TmdbFilmGallery listOfFilmObjects={films} isLoading={true} />)
    expect(screen.queryByTestId("tmdb-card-1")).toBeNull()
  })

  it("does NOT render 'No films found' message when isLoading=true", () => {
    render(<TmdbFilmGallery listOfFilmObjects={[]} isLoading={true} />)
    expect(screen.queryByText(/No films found/)).toBeNull()
  })
})

// ─── Empty state ──────────────────────────────────────────────────────────────

describe("TmdbFilmGallery — empty state", () => {
  it("renders 'No films found based on current settings.' when list is empty", () => {
    render(<TmdbFilmGallery listOfFilmObjects={[]} />)
    expect(screen.getByText("No films found based on current settings.")).toBeTruthy()
  })

  it("does NOT render any TmdbFilmCard when list is empty", () => {
    render(<TmdbFilmGallery listOfFilmObjects={[]} />)
    expect(screen.queryByTestId("tmdb-card-1")).toBeNull()
  })

  it("does NOT render skeletons when not loading", () => {
    render(<TmdbFilmGallery listOfFilmObjects={[]} />)
    expect(screen.queryByTestId("film-card-skeleton")).toBeNull()
  })
})

// ─── Populated state ──────────────────────────────────────────────────────────

describe("TmdbFilmGallery — populated state", () => {
  it("renders one TmdbFilmCard per item", () => {
    render(<TmdbFilmGallery listOfFilmObjects={films} />)
    expect(screen.getAllByTestId(/^tmdb-card-/)).toHaveLength(films.length)
  })

  it("each card has the correct testid", () => {
    render(<TmdbFilmGallery listOfFilmObjects={films} />)
    films.forEach((f) => {
      expect(screen.getByTestId(`tmdb-card-${f.id}`)).toBeTruthy()
    })
  })

  it("does NOT render 'No films found' message", () => {
    render(<TmdbFilmGallery listOfFilmObjects={films} />)
    expect(screen.queryByText(/No films found/)).toBeNull()
  })

  it("does NOT render skeletons", () => {
    render(<TmdbFilmGallery listOfFilmObjects={films} />)
    expect(screen.queryByTestId("film-card-skeleton")).toBeNull()
  })
})
