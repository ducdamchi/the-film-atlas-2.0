import { render, screen, fireEvent } from "@testing-library/react"
import TmdbDirectorGallery from "./TmdbDirectorGallery"
import { makeTmdbDirectorResult } from "./__fixtures__/director"

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

beforeEach(() => mockNavigate.mockClear())

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const kubrick = makeTmdbDirectorResult()

const mixedKnownFor = makeTmdbDirectorResult({
  id: 101,
  name: "David Lynch",
  profile_path: "/lynch.jpg",
  known_for: [
    { id: 20, media_type: "movie", title: "Mulholland Drive" },
    { id: 21, media_type: "tv", name: "Twin Peaks" },
    { id: 22, media_type: "movie", original_title: "Blue Velvet" },
  ],
})

const noProfile = makeTmdbDirectorResult({
  id: 200,
  name: "Anonymous Director",
  profile_path: null,
  known_for: [],
})

const singleKnownFor = makeTmdbDirectorResult({
  id: 300,
  name: "Orson Welles",
  profile_path: "/welles.jpg",
  known_for: [{ id: 30, media_type: "movie", title: "Citizen Kane" }],
})

// ─── Empty state ──────────────────────────────────────────────────────────────

describe("TmdbDirectorGallery — empty state", () => {
  it("renders 'No directors found.' when list is empty", () => {
    render(<TmdbDirectorGallery listOfDirectorObjects={[]} />)
    expect(screen.getByText("No directors found.")).toBeTruthy()
  })

  it("does not render any images when list is empty", () => {
    const { container } = render(<TmdbDirectorGallery listOfDirectorObjects={[]} />)
    expect(container.querySelector("img")).toBeNull()
  })

  it("does not render the 'No directors found.' message when list is non-empty", () => {
    render(<TmdbDirectorGallery listOfDirectorObjects={[kubrick]} />)
    expect(screen.queryByText("No directors found.")).toBeNull()
  })
})

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("TmdbDirectorGallery — rendering", () => {
  it("renders each word of the director name in its own element", () => {
    render(<TmdbDirectorGallery listOfDirectorObjects={[kubrick]} />)
    expect(screen.getByText("Stanley")).toBeTruthy()
    expect(screen.getByText("Kubrick")).toBeTruthy()
  })

  it("renders a single-word name as one element", () => {
    const director = makeTmdbDirectorResult({ id: 99, name: "Hitchcock", known_for: [] })
    render(<TmdbDirectorGallery listOfDirectorObjects={[director]} />)
    expect(screen.getByText("Hitchcock")).toBeTruthy()
  })

  it("renders known_for movie titles", () => {
    render(<TmdbDirectorGallery listOfDirectorObjects={[kubrick]} />)
    expect(screen.getByText("2001: A Space Odyssey")).toBeTruthy()
    expect(screen.getByText("The Shining")).toBeTruthy()
  })

  it("renders known_for tv entry using the name field", () => {
    render(<TmdbDirectorGallery listOfDirectorObjects={[mixedKnownFor]} />)
    expect(screen.getByText("Twin Peaks")).toBeTruthy()
  })

  it("renders known_for entry using original_title as fallback", () => {
    render(<TmdbDirectorGallery listOfDirectorObjects={[mixedKnownFor]} />)
    expect(screen.getByText("Blue Velvet")).toBeTruthy()
  })

  it("uses TMDB base URL + profile_path when profile_path is set", () => {
    const { container } = render(<TmdbDirectorGallery listOfDirectorObjects={[kubrick]} />)
    const img = container.querySelector("img")!
    expect(img.src).toContain("/kubrick.jpg")
  })

  it("uses fallback /picnotfound.jpg when profile_path is null", () => {
    const { container } = render(<TmdbDirectorGallery listOfDirectorObjects={[noProfile]} />)
    const img = container.querySelector("img")!
    expect(img.src).toContain("/picnotfound.jpg")
  })

  it("renders a comma separator between known_for items", () => {
    const { container } = render(<TmdbDirectorGallery listOfDirectorObjects={[kubrick]} />)
    // Two known_for items → one comma separator
    expect(container.textContent).toMatch(/,/)
  })

  it("does not render a trailing comma after the last known_for item", () => {
    const { container } = render(<TmdbDirectorGallery listOfDirectorObjects={[singleKnownFor]} />)
    // Single known_for → no comma separator
    // Check comma separator span is absent
    const spans = Array.from(container.querySelectorAll("span"))
    const commaSpan = spans.find((s) => s.textContent === ",\u00a0")
    expect(commaSpan).toBeUndefined()
  })

  it("renders multiple directors side by side", () => {
    const directors = [kubrick, mixedKnownFor]
    render(<TmdbDirectorGallery listOfDirectorObjects={directors} />)
    expect(screen.getByText("Stanley")).toBeTruthy()
    expect(screen.getByText("David")).toBeTruthy()
  })

  it("renders an image for each director in the list", () => {
    const { container } = render(<TmdbDirectorGallery listOfDirectorObjects={[kubrick, noProfile]} />)
    expect(container.querySelectorAll("img")).toHaveLength(2)
  })
})

// ─── Navigation ───────────────────────────────────────────────────────────────

describe("TmdbDirectorGallery — navigation", () => {
  it("clicking the director image navigates to /person/director/{id}", () => {
    const { container } = render(<TmdbDirectorGallery listOfDirectorObjects={[kubrick]} />)
    fireEvent.click(container.querySelector("img")!)
    expect(mockNavigate).toHaveBeenCalledWith({ to: `/person/director/${kubrick.id}` })
  })

  it("clicking a director name word navigates to /person/director/{id}", () => {
    render(<TmdbDirectorGallery listOfDirectorObjects={[kubrick]} />)
    fireEvent.click(screen.getByText("Stanley"))
    expect(mockNavigate).toHaveBeenCalledWith({ to: `/person/director/${kubrick.id}` })
  })

  it("clicking a movie known_for title navigates to /films/{id}", () => {
    render(<TmdbDirectorGallery listOfDirectorObjects={[kubrick]} />)
    fireEvent.click(screen.getByText("2001: A Space Odyssey"))
    expect(mockNavigate).toHaveBeenCalledWith({ to: `/films/10` })
  })

  it("clicking a tv known_for item does not navigate to a film route", () => {
    render(<TmdbDirectorGallery listOfDirectorObjects={[mixedKnownFor]} />)
    mockNavigate.mockClear()
    fireEvent.click(screen.getByText("Twin Peaks"))
    const filmCalls = mockNavigate.mock.calls.filter((c) => c[0]?.to?.startsWith("/films/"))
    expect(filmCalls).toHaveLength(0)
  })

  it("navigates to the correct film when multiple known_for movies are present", () => {
    render(<TmdbDirectorGallery listOfDirectorObjects={[kubrick]} />)
    fireEvent.click(screen.getByText("The Shining"))
    expect(mockNavigate).toHaveBeenCalledWith({ to: `/films/11` })
  })

  it("navigates to the correct director when multiple directors are rendered", () => {
    const { container } = render(<TmdbDirectorGallery listOfDirectorObjects={[kubrick, mixedKnownFor]} />)
    const images = container.querySelectorAll("img")
    // Second image belongs to mixedKnownFor (Lynch, id=101)
    fireEvent.click(images[1])
    expect(mockNavigate).toHaveBeenCalledWith({ to: `/person/director/${mixedKnownFor.id}` })
  })
})
