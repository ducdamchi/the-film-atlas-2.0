// ─── Mocks ────────────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}))

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
}))

// ─── Project imports ──────────────────────────────────────────────────────────

import { render, screen, fireEvent } from "@testing-library/react"
import PersonList from "./PersonList"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const director = {
  id: 1,
  name: "Akira Kurosawa",
  profile_path: "/kurosawa.jpg",
  jobs: ["Director", "Producer"],
}

const castMember = {
  id: 2,
  name: "Toshiro Mifune",
  profile_path: "/mifune.jpg",
  character: "Kikuchiyo",
}

const crewMember = {
  id: 3,
  name: "Fumio Hayasaka",
  profile_path: "/hayasaka.jpg",
  jobs: ["Original Music Composer"],
  known_for_department: "Sound",
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── 1. Section title ─────────────────────────────────────────────────────────

describe("PersonList — section title", () => {
  it("renders the given title", () => {
    render(<PersonList title="main cast" listOfPeople={[castMember]} type="cast" />)
    expect(screen.getByText("main cast")).toBeTruthy()
  })

  it("renders a different title", () => {
    render(<PersonList title="main crew" listOfPeople={[crewMember]} type="crew" />)
    expect(screen.getByText("main crew")).toBeTruthy()
  })
})

// ─── 2. Card count ────────────────────────────────────────────────────────────

describe("PersonList — card count", () => {
  it("renders one card per person", () => {
    render(
      <PersonList
        title="cast"
        listOfPeople={[castMember, { ...castMember, id: 10, name: "Actor Two" }]}
        type="cast"
      />,
    )
    expect(screen.getAllByRole("img")).toHaveLength(2)
  })

  it("renders nothing when list is empty", () => {
    render(<PersonList title="cast" listOfPeople={[]} type="cast" />)
    expect(screen.queryByRole("img")).toBeNull()
  })
})

// ─── 3. Cast — character label ────────────────────────────────────────────────

describe("PersonList — cast type", () => {
  it("shows 'as {character}' label", () => {
    render(<PersonList title="cast" listOfPeople={[castMember]} type="cast" />)
    expect(screen.getByText(`as ${castMember.character}`)).toBeTruthy()
  })

  it("does not show a character label when type=crew", () => {
    render(<PersonList title="crew" listOfPeople={[crewMember]} type="crew" />)
    expect(screen.queryByText(/^as /)).toBeNull()
  })
})

// ─── 4. Crew — job labels ─────────────────────────────────────────────────────

describe("PersonList — crew type", () => {
  it("renders job titles for crew members", () => {
    render(<PersonList title="crew" listOfPeople={[crewMember]} type="crew" />)
    expect(screen.getByText("Original Music Composer")).toBeTruthy()
  })

  it("renders multiple jobs separated by commas for crew members", () => {
    render(<PersonList title="crew" listOfPeople={[director]} type="crew" />)
    expect(screen.getByText("Director")).toBeTruthy()
    expect(screen.getByText("Producer")).toBeTruthy()
  })

  it("does not render job labels when type=cast", () => {
    const castWithJobs = { ...castMember, jobs: ["Actor"] }
    render(<PersonList title="cast" listOfPeople={[castWithJobs]} type="cast" />)
    // jobs list should not be rendered in cast mode; character label should appear instead
    expect(screen.queryByText("Actor")).toBeNull()
    expect(screen.getByText(`as ${castMember.character}`)).toBeTruthy()
  })
})

// ─── 5. Person names ──────────────────────────────────────────────────────────

describe("PersonList — person names", () => {
  it("displays each person's name", () => {
    render(
      <PersonList
        title="cast"
        listOfPeople={[castMember, { ...castMember, id: 99, name: "Second Actor", character: "Kambei" }]}
        type="cast"
      />,
    )
    // CSS `uppercase` class is not applied in JSDOM — match raw text values
    expect(screen.getByText("Toshiro Mifune")).toBeTruthy()
    expect(screen.getByText("Second Actor")).toBeTruthy()
  })

  it("displays the director's raw name (CSS uppercase is browser-only)", () => {
    render(<PersonList title="crew" listOfPeople={[director]} type="crew" />)
    expect(screen.getByText("Akira Kurosawa")).toBeTruthy()
  })
})

// ─── 6. Navigation ────────────────────────────────────────────────────────────

describe("PersonList — navigation", () => {
  it("navigates to /director/:id when clicking a director's name", () => {
    render(<PersonList title="crew" listOfPeople={[director]} type="crew" />)
    fireEvent.click(screen.getByText("Akira Kurosawa"))
    expect(mocks.navigate).toHaveBeenCalledWith({ to: `/director/${director.id}` })
  })

  it("navigates to /actor/:id when clicking a cast member's image", () => {
    // Cast members without known_for_department have onClick only on the image container
    // (the name div falls through to the no-onClick branch), so click the img instead.
    render(<PersonList title="cast" listOfPeople={[castMember]} type="cast" />)
    fireEvent.click(screen.getByRole("img"))
    expect(mocks.navigate).toHaveBeenCalledWith({ to: `/actor/${castMember.id}` })
  })

  it("navigates to /actor/:id for crew with known_for_department=Acting", () => {
    const actorCrew = {
      id: 5,
      name: "Acting Crew Person",
      profile_path: "/person.jpg",
      jobs: ["Special Thanks"],
      known_for_department: "Acting",
    }
    render(<PersonList title="crew" listOfPeople={[actorCrew]} type="crew" />)
    // known_for_department=Acting → branch 2, name div has onClick
    fireEvent.click(screen.getByText("Acting Crew Person"))
    expect(mocks.navigate).toHaveBeenCalledWith({ to: `/actor/${actorCrew.id}` })
  })

  it("does not navigate for a non-director, non-actor crew member", () => {
    render(<PersonList title="crew" listOfPeople={[crewMember]} type="crew" />)
    // The name div has no onClick — the image container also has no personRoute
    fireEvent.click(screen.getByText("Fumio Hayasaka"))
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
})

// ─── 7. Profile image ─────────────────────────────────────────────────────────

describe("PersonList — profile image", () => {
  it("uses the fallback image when profile_path is null", () => {
    const noPic = { ...castMember, profile_path: null }
    render(<PersonList title="cast" listOfPeople={[noPic]} type="cast" />)
    const img = screen.getByRole("img") as HTMLImageElement
    expect(img.src).toContain("/picnotfound.jpg")
  })

  it("includes profile_path in the image src when present", () => {
    render(<PersonList title="cast" listOfPeople={[castMember]} type="cast" />)
    const img = screen.getByRole("img") as HTMLImageElement
    expect(img.src).toContain(castMember.profile_path)
  })
})
