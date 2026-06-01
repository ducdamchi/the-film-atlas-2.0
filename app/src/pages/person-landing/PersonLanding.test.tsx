// ─── Mocks (hoisted before imports) ───────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  tmdbId: "1",
  useSuspenseQuery: vi.fn(),
  useQuery: vi.fn(() => ({ data: undefined })),
  setSearchModalOpen: vi.fn(),
  computeDirectorScore: vi.fn(() => 42),
}))

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ tmdbId: mocks.tmdbId }),
}))

vi.mock("@tanstack/react-query", () => ({
  useSuspenseQuery: mocks.useSuspenseQuery,
  useQuery: mocks.useQuery,
}))

vi.mock("@/utils/authContext", () => ({
  useAuth: vi.fn(() => ({ authState: { status: false } })),
}))

vi.mock("@/utils/appContext", () => ({
  useApp: () => ({ setSearchModalOpen: mocks.setSearchModalOpen }),
}))

vi.mock("../../queries/person.queries", () => ({
  personQueryOptions: vi.fn(() => ({ queryKey: ["person"], queryFn: vi.fn() })),
  directorStatusQueryOptions: vi.fn(() => ({ queryKey: ["directorStatus"], queryFn: vi.fn() })),
}))

vi.mock("@/utils/directorScore", () => ({
  computeDirectorScore: mocks.computeDirectorScore,
}))

vi.mock("../../components/film/TmdbFilmGallery", () => ({
  default: ({ listOfFilmObjects }: { listOfFilmObjects: unknown[] }) => (
    <div data-testid="film-gallery" data-count={listOfFilmObjects.length} />
  ),
}))

// ─── Project imports ──────────────────────────────────────────────────────────

import { render, screen, fireEvent } from "@testing-library/react"
import PersonLanding from "./PersonLanding"
import type { TMDBPerson, TMDBFilmSummary } from "@/types/tmdb"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeFilmSummary(overrides?: Partial<TMDBFilmSummary & { job?: string }>): TMDBFilmSummary & { job?: string } {
  return {
    id: 100,
    title: "Seven Samurai",
    overview: "A samurai epic.",
    release_date: "1954-04-26",
    poster_path: "/poster.jpg",
    backdrop_path: "/backdrop.jpg",
    popularity: 20,
    vote_average: 8.1,
    vote_count: 5000,
    origin_country: ["JP"],
    ...overrides,
  }
}

function makePerson(overrides?: Partial<TMDBPerson>): TMDBPerson {
  return {
    id: 1,
    name: "Akira Kurosawa",
    biography: "Akira Kurosawa was a Japanese filmmaker.",
    birthday: "1910-03-23",
    deathday: null,
    place_of_birth: "Shinagawa, Tokyo, Japan",
    profile_path: "/kurosawa.jpg",
    known_for_department: "Directing",
    movie_credits: {
      cast: [],
      crew: [],
    },
    ...overrides,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setPerson(person: TMDBPerson = makePerson()) {
  mocks.useSuspenseQuery.mockReturnValue({ data: person })
}

function setDirectorStatus(status?: {
  watched?: number
  starred?: number
  avg_rating?: number
  num_stars_total?: number
}) {
  mocks.useQuery.mockReturnValue({ data: status })
}

function renderPersonLanding(job: "director" | "actor" = "director") {
  return render(<PersonLanding job={job} />)
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  setPerson()
  setDirectorStatus()
})

// ─── 1. Person identity ───────────────────────────────────────────────────────

describe("PersonLanding — person identity", () => {
  it("renders the person's name", () => {
    renderPersonLanding()
    expect(screen.getByText("Akira Kurosawa")).toBeTruthy()
  })

  it("renders a different person's name", () => {
    setPerson(makePerson({ name: "Stanley Kubrick" }))
    renderPersonLanding()
    expect(screen.getByText("Stanley Kubrick")).toBeTruthy()
  })
})

// ─── 2. Birthday / deathday ───────────────────────────────────────────────────

describe("PersonLanding — birthday and deathday", () => {
  it("renders the birthday when present", () => {
    setPerson(makePerson({ birthday: "1910-03-23" }))
    renderPersonLanding()
    // getNiceMonthDateYear("1910-03-23") → "March 23, 1910"
    expect(screen.getByText(/March 23, 1910/)).toBeTruthy()
  })

  it("does not render a birthday when birthday is null", () => {
    setPerson(makePerson({ birthday: null }))
    renderPersonLanding()
    expect(screen.queryByText(/March 23, 1910/)).toBeNull()
  })

  it("renders the deathday when present", () => {
    setPerson(makePerson({ birthday: "1910-03-23", deathday: "1998-09-06" }))
    renderPersonLanding()
    expect(screen.getByText(/September 6, 1998/)).toBeTruthy()
  })

  it("does not render a deathday when deathday is null", () => {
    setPerson(makePerson({ deathday: null }))
    renderPersonLanding()
    expect(screen.queryByText(/September 6, 1998/)).toBeNull()
  })
})

// ─── 3. Birthplace ────────────────────────────────────────────────────────────

describe("PersonLanding — birthplace", () => {
  it("renders the place of birth when present", () => {
    renderPersonLanding()
    expect(screen.getByText("Shinagawa, Tokyo, Japan")).toBeTruthy()
  })

  it("does not render a birthplace when place_of_birth is null", () => {
    setPerson(makePerson({ place_of_birth: null }))
    renderPersonLanding()
    expect(screen.queryByText("Shinagawa, Tokyo, Japan")).toBeNull()
  })
})

// ─── 4. Biography ─────────────────────────────────────────────────────────────

describe("PersonLanding — biography", () => {
  it("renders the Biography heading when bio is present", () => {
    renderPersonLanding()
    // "Biography" appears in both the overlay column and the below-fold fallback
    expect(screen.getAllByText("Biography").length).toBeGreaterThan(0)
  })

  it("renders a short biography in full", () => {
    setPerson(makePerson({ biography: "Short bio." }))
    renderPersonLanding()
    expect(screen.getAllByText("Short bio.").length).toBeGreaterThan(0)
  })

  it("truncates a long biography and shows a 'more' button", () => {
    const longBio = Array.from({ length: 80 }, (_, i) => `word${i}`).join(" ")
    setPerson(makePerson({ biography: longBio }))
    renderPersonLanding()
    // There are two bio render sites (overlay + below-fold); at least one 'more' button appears
    expect(screen.getAllByText("more").length).toBeGreaterThan(0)
  })

  it("expands a truncated biography when 'more' is clicked (below-fold)", () => {
    const longBio = Array.from({ length: 80 }, (_, i) => `word${i}`).join(" ")
    setPerson(makePerson({ biography: longBio }))
    renderPersonLanding()
    const moreButtons = screen.getAllByText("more")
    fireEvent.click(moreButtons[moreButtons.length - 1]) // click the below-fold 'more'
    // After expanding, 'less' button should appear
    expect(screen.getByText("less")).toBeTruthy()
  })
})

// ─── 5. Director stats ────────────────────────────────────────────────────────

describe("PersonLanding — director stats pills", () => {
  it("shows condensed stats pills for director job", () => {
    setDirectorStatus({ watched: 5, starred: 3, avg_rating: 2, num_stars_total: 6 })
    renderPersonLanding("director")
    expect(screen.getByText(/Watched: 5/)).toBeTruthy()
    expect(screen.getByText(/Starred: 3/)).toBeTruthy()
    expect(screen.getByText(/Avg. Stars: 2/)).toBeTruthy()
  })

  it("shows score in condensed stats pills for director job", () => {
    setDirectorStatus({ watched: 5, starred: 3, avg_rating: 2, num_stars_total: 6 })
    renderPersonLanding("director")
    expect(screen.getByText(/Score: 42/)).toBeTruthy()
  })

  it("does not show director stats pills when job=actor", () => {
    setDirectorStatus({ watched: 5, starred: 3, avg_rating: 2, num_stars_total: 6 })
    renderPersonLanding("actor")
    expect(screen.queryByText(/Watched:/)).toBeNull()
  })

  it("shows zero values in stats pills when no director status exists", () => {
    setDirectorStatus(undefined)
    renderPersonLanding("director")
    expect(screen.getByText("Watched: 0")).toBeTruthy()
    expect(screen.getByText("Starred: 0")).toBeTruthy()
  })

  it("shows the Stats heading in the right overlay column for director job", () => {
    renderPersonLanding("director")
    expect(screen.getByText("Stats")).toBeTruthy()
  })

  it("does not show the Stats heading when job=actor", () => {
    renderPersonLanding("actor")
    expect(screen.queryByText("Stats")).toBeNull()
  })
})

// ─── 6. Filmography ───────────────────────────────────────────────────────────

describe("PersonLanding — filmography", () => {
  it("renders the 'filmography' section label", () => {
    renderPersonLanding()
    expect(screen.getByText("filmography")).toBeTruthy()
  })

  it("renders the TmdbFilmGallery component", () => {
    renderPersonLanding()
    expect(screen.getByTestId("film-gallery")).toBeTruthy()
  })

  it("passes director films (crew with job=Director) to the gallery", () => {
    const directorFilm = makeFilmSummary({ id: 1, job: "Director" })
    const producerFilm = makeFilmSummary({ id: 2, job: "Producer" })
    setPerson(
      makePerson({
        movie_credits: {
          cast: [],
          crew: [directorFilm, producerFilm] as TMDBFilmSummary[],
        },
      }),
    )
    renderPersonLanding("director")
    const gallery = screen.getByTestId("film-gallery")
    // Only directorFilm passes the job=Director filter
    expect(gallery.getAttribute("data-count")).toBe("1")
  })

  it("passes cast films to the gallery for actor job", () => {
    const castFilm1 = makeFilmSummary({ id: 10 })
    const castFilm2 = makeFilmSummary({ id: 11 })
    setPerson(
      makePerson({
        movie_credits: {
          cast: [castFilm1, castFilm2],
          crew: [],
        },
      }),
    )
    renderPersonLanding("actor")
    const gallery = screen.getByTestId("film-gallery")
    expect(gallery.getAttribute("data-count")).toBe("2")
  })

  it("excludes films with null backdrop_path from filmography", () => {
    const validFilm = makeFilmSummary({ id: 1, job: "Director" })
    const noBackdrop = makeFilmSummary({ id: 2, job: "Director", backdrop_path: null })
    setPerson(
      makePerson({
        movie_credits: {
          cast: [],
          crew: [validFilm, noBackdrop] as TMDBFilmSummary[],
        },
      }),
    )
    renderPersonLanding("director")
    expect(screen.getByTestId("film-gallery").getAttribute("data-count")).toBe("1")
  })

  it("excludes films with null poster_path from filmography", () => {
    const validFilm = makeFilmSummary({ id: 1, job: "Director" })
    const noPoster = makeFilmSummary({ id: 2, job: "Director", poster_path: null })
    setPerson(
      makePerson({
        movie_credits: {
          cast: [],
          crew: [validFilm, noPoster] as TMDBFilmSummary[],
        },
      }),
    )
    renderPersonLanding("director")
    expect(screen.getByTestId("film-gallery").getAttribute("data-count")).toBe("1")
  })

  it("excludes films released after deathday", () => {
    const beforeDeath = makeFilmSummary({ id: 1, job: "Director", release_date: "1990-01-01" })
    const afterDeath = makeFilmSummary({ id: 2, job: "Director", release_date: "2000-01-01" })
    setPerson(
      makePerson({
        deathday: "1995-06-01",
        movie_credits: {
          cast: [],
          crew: [beforeDeath, afterDeath] as TMDBFilmSummary[],
        },
      }),
    )
    renderPersonLanding("director")
    expect(screen.getByTestId("film-gallery").getAttribute("data-count")).toBe("1")
  })

  it("passes an empty list to the gallery when person has no credits", () => {
    renderPersonLanding("director")
    expect(screen.getByTestId("film-gallery").getAttribute("data-count")).toBe("0")
  })
})
