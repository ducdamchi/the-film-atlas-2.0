// ─── Mocks (hoisted before imports) ───────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  tmdbId: "202",
  useSuspenseQuery: vi.fn(),
  useQuery: vi.fn(() => ({ data: undefined })),
  setSearchModalOpen: vi.fn(),
}))

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ tmdbId: mocks.tmdbId }),
  useNavigate: () => mocks.navigate,
  ClientOnly: ({ children }: { children: () => React.ReactNode }) => (
    <>{children()}</>
  ),
}))

vi.mock("@tanstack/react-query", () => ({
  useSuspenseQuery: mocks.useSuspenseQuery,
  useQuery: mocks.useQuery,
}))

vi.mock("@/utils/appContext", () => ({
  useApp: () => ({ setSearchModalOpen: mocks.setSearchModalOpen }),
}))

vi.mock("../../hooks/useCommandKey", () => ({
  default: vi.fn(),
}))

vi.mock("../../queries/film.queries", () => ({
  filmQueryOptions: vi.fn(() => ({ queryKey: ["film"], queryFn: vi.fn() })),
  omdbQueryOptions: vi.fn(() => ({ queryKey: ["omdb"], queryFn: vi.fn() })),
  wikidataQueryOptions: vi.fn(() => ({
    queryKey: ["wikidata"],
    queryFn: vi.fn(),
  })),
  // ytsQueryOptions: vi.fn(() => ({ queryKey: ["yts"], queryFn: vi.fn() })),
  // subtitlesQueryOptions: vi.fn(() => ({ queryKey: ["subs"], queryFn: vi.fn() })),
}))

vi.mock("../../components/film/InteractionConsole", () => ({
  default: () => <div data-testid="interaction-console" />,
}))

vi.mock("./components/PersonList", () => ({
  default: ({
    title,
    listOfPeople,
  }: {
    title: string
    listOfPeople: unknown[]
  }) => (
    <div
      data-testid={`person-list-${title.replace(/\s+/g, "-")}`}
      data-count={listOfPeople.length}
    />
  ),
}))

vi.mock("./components/TrailerModal", () => ({
  default: ({ closeModal }: { closeModal: () => void }) => (
    <div data-testid="trailer-modal">
      <button onClick={closeModal}>close</button>
    </div>
  ),
}))

vi.mock("./components/Torrents", () => ({ default: () => null }))
vi.mock("./components/Subtitles", () => ({ default: () => null }))

// ─── Project imports ──────────────────────────────────────────────────────────

import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import FilmLanding from "./FilmLanding"
import { makeMovieDetails } from "../../components/film/__fixtures__/film"
import type { TMDBFilm, TMDBCastMember, TMDBCrewMember } from "@/types/tmdb"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeDirectorCrew(overrides?: Partial<TMDBCrewMember>): TMDBCrewMember {
  return {
    id: 1,
    name: "Akira Kurosawa",
    job: "Director",
    department: "Directing",
    profile_path: "/kurosawa.jpg",
    credit_id: "abc",
    known_for_department: "Directing",
    ...overrides,
  }
}

function makeCastMember(overrides?: Partial<TMDBCastMember>): TMDBCastMember {
  return {
    id: 10,
    name: "Toshiro Mifune",
    character: "Kikuchiyo",
    profile_path: "/mifune.jpg",
    order: 0,
    credit_id: "xyz",
    known_for_department: "Acting",
    ...overrides,
  }
}

const baseFilm: TMDBFilm = makeMovieDetails({
  credits: {
    cast: [makeCastMember()],
    crew: [makeDirectorCrew()],
  },
  videos: { results: [] },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setFilm(film: TMDBFilm = baseFilm) {
  mocks.useSuspenseQuery.mockReturnValue({ data: film })
}

function setRatings(ratings: unknown) {
  // useQuery is called twice (omdb, then wikidata); set omdb first, awards second
  mocks.useQuery
    .mockReturnValueOnce({ data: ratings })
    .mockReturnValueOnce({ data: undefined })
}

function setAwards(awards: unknown) {
  mocks.useQuery
    .mockReturnValueOnce({ data: undefined })
    .mockReturnValueOnce({ data: awards })
}

function renderFilmLanding() {
  return render(<FilmLanding />)
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  setFilm()
  mocks.useQuery.mockReturnValue({ data: undefined })
})

// ─── 1. Film metadata ─────────────────────────────────────────────────────────

describe("FilmLanding — film metadata", () => {
  it("renders the film title", () => {
    renderFilmLanding()
    // CSS `uppercase` class is not applied in JSDOM — match the raw text value
    expect(screen.getByText("Rashomon")).toBeTruthy()
  })

  it("renders genres as a comma-separated string", () => {
    setFilm(
      makeMovieDetails({
        genres: [
          { id: 18, name: "Drama" },
          { id: 27, name: "Mystery" },
        ],
      }),
    )
    renderFilmLanding()
    expect(screen.getByText("Drama, Mystery")).toBeTruthy()
  })

  it("renders 'Directed by' with the director's name", () => {
    renderFilmLanding()
    expect(screen.getByText(/Directed by/)).toBeTruthy()
    expect(screen.getByText("Akira Kurosawa")).toBeTruthy()
  })

  it("renders the release year", () => {
    renderFilmLanding()
    // Rashomon release date is 1950-08-25 → year 1950
    expect(screen.getByText("1950")).toBeTruthy()
  })

  it("renders the runtime in minutes", () => {
    renderFilmLanding()
    expect(screen.getByText("88 min")).toBeTruthy()
  })

  it("renders the spoken language", () => {
    renderFilmLanding()
    expect(screen.getByText("Japanese")).toBeTruthy()
  })

  it("renders the origin country", () => {
    renderFilmLanding()
    // Japan resolves to "Japan" via Intl.DisplayNames
    expect(screen.getByText("Japan")).toBeTruthy()
  })
})

// ─── 2. Director navigation ───────────────────────────────────────────────────

describe("FilmLanding — director navigation", () => {
  it("navigates to /director/:id when clicking director name", () => {
    renderFilmLanding()
    fireEvent.click(screen.getByText("Akira Kurosawa"))
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/director/1" })
  })

  it("does not render 'Directed by' when there are no directors", () => {
    setFilm(makeMovieDetails({ credits: { cast: [], crew: [] } }))
    renderFilmLanding()
    expect(screen.queryByText(/Directed by/)).toBeNull()
  })
})

// ─── 3. Trailer button ────────────────────────────────────────────────────────

describe("FilmLanding — trailer button", () => {
  it("shows the trailer button when a trailer exists", () => {
    setFilm(
      makeMovieDetails({
        videos: {
          results: [
            {
              id: "v1",
              key: "abc123",
              site: "YouTube",
              type: "Trailer",
              published_at: "2022-01-01T00:00:00Z",
              official: true,
            },
          ],
        },
      }),
    )
    renderFilmLanding()
    expect(screen.getByText("Trailer")).toBeTruthy()
  })

  it("hides the trailer button when there are no trailers", () => {
    setFilm(makeMovieDetails({ videos: { results: [] } }))
    renderFilmLanding()
    expect(screen.queryByText("Trailer")).toBeNull()
  })

  it("opens the trailer modal when the trailer button is clicked", () => {
    setFilm(
      makeMovieDetails({
        videos: {
          results: [
            {
              id: "v1",
              key: "abc123",
              site: "YouTube",
              type: "Trailer",
              published_at: "2022-01-01T00:00:00Z",
              official: true,
            },
          ],
        },
      }),
    )
    renderFilmLanding()
    fireEvent.click(screen.getByText("Trailer"))
    expect(screen.getByTestId("trailer-modal")).toBeTruthy()
  })

  it("closes the trailer modal when the close button is clicked", () => {
    setFilm(
      makeMovieDetails({
        videos: {
          results: [
            {
              id: "v1",
              key: "abc123",
              site: "YouTube",
              type: "Trailer",
              published_at: "2022-01-01T00:00:00Z",
              official: true,
            },
          ],
        },
      }),
    )
    renderFilmLanding()
    fireEvent.click(screen.getByText("Trailer"))
    fireEvent.click(screen.getByText("close"))
    expect(screen.queryByTestId("trailer-modal")).toBeNull()
  })
})

// ─── 4. Synopsis ──────────────────────────────────────────────────────────────

describe("FilmLanding — synopsis", () => {
  it("renders the overview text in the synopsis overlay column", () => {
    renderFilmLanding()
    // overview appears twice (overlay col + below-fold fallback); getByText uses first match
    expect(screen.getAllByText(/murder mystery/).length).toBeGreaterThan(0)
  })

  it("renders the 'Synopsis' heading", () => {
    renderFilmLanding()
    expect(screen.getByText("Synopsis")).toBeTruthy()
  })
})

// ─── 5. Cast & Crew ───────────────────────────────────────────────────────────

describe("FilmLanding — cast and crew", () => {
  it("renders the main cast PersonList", () => {
    renderFilmLanding()
    expect(screen.getByTestId("person-list-main-cast")).toBeTruthy()
  })

  it("passes correct cast count to main cast PersonList", () => {
    renderFilmLanding()
    const castList = screen.getByTestId("person-list-main-cast")
    expect(castList.getAttribute("data-count")).toBe("1")
  })

  it("renders the main crew PersonList", () => {
    renderFilmLanding()
    expect(screen.getByTestId("person-list-main-crew")).toBeTruthy()
  })

  it("does not render cast PersonList when all cast members have no profile_path", () => {
    setFilm(
      makeMovieDetails({
        credits: {
          cast: [{ ...makeCastMember(), profile_path: null }],
          crew: [],
        },
      }),
    )
    renderFilmLanding()
    expect(screen.queryByTestId("person-list-main-cast")).toBeNull()
  })

  it("does not render crew PersonList when crew has no valid profile_paths", () => {
    setFilm(
      makeMovieDetails({
        credits: {
          cast: [makeCastMember()],
          crew: [{ ...makeDirectorCrew(), profile_path: null }],
        },
      }),
    )
    renderFilmLanding()
    expect(screen.queryByTestId("person-list-main-crew")).toBeNull()
  })
})

// ─── 6. Ratings & Awards (below-fold) ─────────────────────────────────────────

describe("FilmLanding — ratings and awards below fold", () => {
  it("renders the 'ratings & awards' section when ratings exist", () => {
    setRatings({
      Response: "True",
      imdbRating: "8.2",
      imdbVotes: "4,100",
      Ratings: [{ Source: "Internet Movie Database", Value: "8.2/10" }],
    })
    renderFilmLanding()
    // The below-fold section title is lowercase
    expect(screen.getByText("ratings & awards")).toBeTruthy()
  })

  it("hides the ratings & awards section when no ratings or awards exist", () => {
    mocks.useQuery.mockReturnValue({ data: undefined })
    renderFilmLanding()
    expect(screen.queryByText("ratings & awards")).toBeNull()
  })

  it("renders the awards section when wikidata awards are present", () => {
    setAwards({
      wins: [{ award: "Best Picture", year: "1951" }],
      nominations: [],
    })
    renderFilmLanding()
    expect(screen.getByText("ratings & awards")).toBeTruthy()
  })

  it("does not render ratings section when filmRatings.Response is not 'True'", () => {
    setRatings({ Response: "False" })
    renderFilmLanding()
    expect(screen.queryByText("ratings & awards")).toBeNull()
  })
})

// ─── 7. InteractionConsole ────────────────────────────────────────────────────

describe("FilmLanding — InteractionConsole", () => {
  it("renders the InteractionConsole", () => {
    renderFilmLanding()
    expect(screen.getByTestId("interaction-console")).toBeTruthy()
  })
})
