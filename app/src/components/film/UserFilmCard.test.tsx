import { render, screen, fireEvent } from "@testing-library/react"
import UserFilmCard from "./UserFilmCard"
import { makeUserFilm, makeDirector } from "./__fixtures__/film"

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("@/hooks/useMarquee", () => ({
  useMarquee: () => ({ current: null }),
}))

vi.mock("./FilmCardPoster", () => ({
  default: () => <div data-testid="film-card-poster" />,
}))

vi.mock("./FilmCardHoverOverlay", () => ({
  default: () => <div data-testid="card-hover-overlay" />,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

// id=101, title="Seven Samurai", release_date="1954-04-26", origin_country=["JP"], directors=[Akira Kurosawa]
const film = makeUserFilm()

beforeEach(() => mockNavigate.mockClear())

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("UserFilmCard — rendering", () => {
  it("renders film title", () => {
    render(<UserFilmCard filmObject={film} queryString="watched" />)
    expect(screen.getByText("Seven Samurai")).toBeTruthy()
  })

  it("renders release year", () => {
    render(<UserFilmCard filmObject={film} queryString="watched" />)
    expect(screen.getByText(/1954/)).toBeTruthy()
  })

  it("renders origin country name via getCountryName", () => {
    render(<UserFilmCard filmObject={film} queryString="watched" />)
    expect(screen.getByText(/Japan/)).toBeTruthy()
  })

  it("renders director thumbnails when directors has entries", () => {
    render(<UserFilmCard filmObject={film} queryString="watched" />)
    // director name as "A. Kurosawa"
    expect(screen.getByText("A. Kurosawa")).toBeTruthy()
  })

  it("renders only 2 directors max when directors array has 3+ entries", () => {
    const threeDirectors = [
      makeDirector({ tmdbId: 1, name: "Akira Kurosawa" }),
      makeDirector({ tmdbId: 2, name: "Yasujiro Ozu" }),
      makeDirector({ tmdbId: 3, name: "Kenji Mizoguchi" }),
    ]
    const filmWith3 = makeUserFilm({ directors: threeDirectors })
    render(<UserFilmCard filmObject={filmWith3} queryString="watched" />)
    // Only first two directors should be visible (index < 2)
    expect(screen.getByText("A. Kurosawa")).toBeTruthy()
    expect(screen.getByText("Y. Ozu")).toBeTruthy()
    expect(screen.queryByText("K. Mizoguchi")).toBeNull()
  })

  it("does not render director names when directors array is empty", () => {
    const filmNoDirectors = makeUserFilm({ directors: [] })
    render(<UserFilmCard filmObject={filmNoDirectors} queryString="watched" />)
    expect(screen.queryByText("A. Kurosawa")).toBeNull()
  })

  it("card root div has id film-card-{filmObject.id}", () => {
    const { container } = render(<UserFilmCard filmObject={film} queryString="watched" />)
    expect(container.querySelector(`#film-card-${film.id}`)).toBeTruthy()
  })

  it("starts with opacity-0 class before image loads", () => {
    const { container } = render(<UserFilmCard filmObject={film} queryString="watched" />)
    const root = container.querySelector(`#film-card-${film.id}`)
    expect(root?.className).toContain("opacity-0")
  })
})

// ─── queryString behavior ─────────────────────────────────────────────────────

describe("UserFilmCard — queryString behavior", () => {
  it("when queryString is null: does NOT render country name", () => {
    render(<UserFilmCard filmObject={film} queryString={null} />)
    expect(screen.queryByText(/Japan/)).toBeNull()
  })

  it("when queryString is null: does NOT render director section", () => {
    render(<UserFilmCard filmObject={film} queryString={null} />)
    expect(screen.queryByText("A. Kurosawa")).toBeNull()
  })

  it("when queryString is provided: renders country name", () => {
    render(<UserFilmCard filmObject={film} queryString="watched" />)
    expect(screen.getByText(/Japan/)).toBeTruthy()
  })

  it("when queryString is provided: renders director section", () => {
    render(<UserFilmCard filmObject={film} queryString="watched" />)
    expect(screen.getByText("A. Kurosawa")).toBeTruthy()
  })
})

// ─── Director display ─────────────────────────────────────────────────────────

describe("UserFilmCard — director display", () => {
  it("renders director name in 'F. LastName' format", () => {
    render(<UserFilmCard filmObject={film} queryString="watched" />)
    expect(screen.getByText("A. Kurosawa")).toBeTruthy()
  })

  it("uses picnotfound.jpg when director.profile_path is null", () => {
    const filmNullProfile = makeUserFilm({
      directors: [makeDirector({ profile_path: null })],
    })
    render(<UserFilmCard filmObject={filmNullProfile} queryString="watched" />)
    const imgs = document.querySelectorAll("img")
    const directorImg = Array.from(imgs).find((img) =>
      img.src.includes("picnotfound.jpg"),
    )
    expect(directorImg).toBeTruthy()
  })
})

// ─── Navigation ───────────────────────────────────────────────────────────────

describe("UserFilmCard — navigation", () => {
  it("clicking title calls navigate to /films/{id}", () => {
    render(<UserFilmCard filmObject={film} queryString="watched" />)
    fireEvent.click(screen.getByText("Seven Samurai"))
    expect(mockNavigate).toHaveBeenCalledWith({ to: `/films/${film.id}` })
  })

  it("clicking a director thumbnail calls navigate to /director/{tmdbId}", () => {
    render(<UserFilmCard filmObject={film} queryString="watched" />)
    fireEvent.click(screen.getByText("A. Kurosawa"))
    expect(mockNavigate).toHaveBeenCalledWith({
      to: `/director/${film.directors[0].tmdbId}`,
    })
  })
})
