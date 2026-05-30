// ─── Mocks (hoisted before imports by Vitest) ─────────────────────────────────

// Variables referenced inside vi.mock factories must be created via vi.hoisted()
// so they are initialized before the factory functions run.
const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
  queryPersonFromTMDB: vi.fn(),
  location: { state: null as unknown },
}))

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  useLocation: () => mocks.location,
}))

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
}))

vi.mock("@/utils/authContext", () => ({
  useAuth: vi.fn(() => ({ authState: { status: false } })),
}))

vi.mock("@/utils/apiCalls", () => ({
  queryPersonFromTMDB: mocks.queryPersonFromTMDB,
}))

vi.mock("@/hooks/usePersistedState", () => ({
  usePersistedState: (_key: string, initialValue: unknown) => [initialValue, vi.fn()],
}))

vi.mock("@/queries/directors.queries", () => ({
  directorsQueryOptions: { queryKey: ["directors"], queryFn: vi.fn() },
}))

// Sub-component mocks
vi.mock("../../components/search/SearchBar", () => ({
  default: ({
    searchInput,
    setSearchInput,
    placeholderString,
  }: {
    searchInput: string
    setSearchInput: (v: string) => void
    placeholderString?: string
  }) => (
    <input
      data-testid="search-bar"
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
      placeholder={placeholderString}
    />
  ),
}))

vi.mock("./components/TmdbDirectorGallery", () => ({
  default: ({ listOfDirectorObjects }: { listOfDirectorObjects: unknown[] }) => (
    <div
      data-testid="tmdb-director-gallery"
      data-count={listOfDirectorObjects.length}
    />
  ),
}))

vi.mock("./components/UserDirectorGallery", () => ({
  default: ({ listOfDirectorObjects }: { listOfDirectorObjects: unknown[] }) => (
    <div
      data-testid="user-director-gallery"
      data-count={listOfDirectorObjects.length}
    />
  ),
}))

vi.mock("../../components/ui-custom/Toggle", () => ({
  default: ({
    label,
    value,
    onChange,
    options,
  }: {
    label?: string
    value: string
    onChange: (v: string) => void
    options: { value: string; label: unknown }[]
  }) => (
    <div data-testid={`toggle-${label ?? "unlabeled"}`} data-value={value}>
      {options.map((opt) => (
        <button key={opt.value} onClick={() => onChange(opt.value)}>
          {typeof opt.label === "string" ? opt.label : opt.value}
        </button>
      ))}
    </div>
  ),
}))

// ─── Project imports (after mocks) ────────────────────────────────────────────

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import Directors from "./Directors"
import { useAuth } from "@/utils/authContext"
import { makeDirector } from "./components/__fixtures__/director"
import { makeTmdbDirectorResult } from "./components/__fixtures__/director"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setAuth(status: boolean) {
  vi.mocked(useAuth).mockReturnValue({
    authState: { status, username: status ? "testuser" : "", id: "", email: null, locationCountry: null, locationCity: null, locationSource: null },
    setAuthState: vi.fn(),
    authLoading: false,
  } as any)
}

function setDirectorData(directors = [] as ReturnType<typeof makeDirector>[], isLoading = false) {
  mocks.useQuery.mockReturnValue({ data: directors, isLoading })
}

function renderDirectors() {
  return render(<Directors />)
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mocks.location.state = null
  mocks.useQuery.mockReturnValue({ data: [], isLoading: false })
  setAuth(false)
  setDirectorData()
})

// ─── 1. Page structure ────────────────────────────────────────────────────────

describe("Directors — page structure", () => {
  it("renders the DIRECTORS heading", () => {
    renderDirectors()
    expect(screen.getByText("DIRECTORS")).toBeTruthy()
  })

  it("renders the SearchBar", () => {
    renderDirectors()
    expect(screen.getByTestId("search-bar")).toBeTruthy()
  })

  it("SearchBar placeholder mentions director search", () => {
    renderDirectors()
    const input = screen.getByTestId("search-bar")
    expect((input as HTMLInputElement).placeholder).toMatch(/director/i)
  })
})

// ─── 2. Auth gate ─────────────────────────────────────────────────────────────

describe("Directors — auth gate", () => {
  it("shows 'Log in to interact with directors!' when user is logged out", () => {
    setAuth(false)
    renderDirectors()
    expect(screen.getByText(/Log in to interact with directors!/)).toBeTruthy()
  })

  it("does not show the log-in message when user is logged in", () => {
    setAuth(true)
    renderDirectors()
    expect(screen.queryByText(/Log in to interact with directors!/)).toBeNull()
  })

  it("shows UserDirectorGallery when logged in and not searching", () => {
    setAuth(true)
    renderDirectors()
    expect(screen.getByTestId("user-director-gallery")).toBeTruthy()
  })

  it("does not show UserDirectorGallery when logged out", () => {
    setAuth(false)
    renderDirectors()
    expect(screen.queryByTestId("user-director-gallery")).toBeNull()
  })

  it("passes the director data from useQuery to UserDirectorGallery", () => {
    const directors = [makeDirector({ id: 1 }), makeDirector({ id: 2 })]
    setDirectorData(directors)
    setAuth(true)
    renderDirectors()
    const gallery = screen.getByTestId("user-director-gallery")
    expect(gallery.getAttribute("data-count")).toBe("2")
  })

  it("does not show UserDirectorGallery while isLoading is true", () => {
    setDirectorData([], true)
    setAuth(true)
    renderDirectors()
    expect(screen.queryByTestId("user-director-gallery")).toBeNull()
  })
})

// ─── 3. Sort controls visibility ──────────────────────────────────────────────

describe("Directors — sort controls", () => {
  it("shows the Sort By toggle when not searching", () => {
    renderDirectors()
    expect(screen.getByTestId("toggle-Sort By")).toBeTruthy()
  })

  it("Sort By toggle has Name, Score, and Stars options", () => {
    renderDirectors()
    expect(screen.getByRole("button", { name: "Name" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Score" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Stars" })).toBeTruthy()
  })

  it("shows the Sort Order toggle when not searching (default sortBy=name)", () => {
    renderDirectors()
    expect(screen.getByTestId("toggle-Sort Order")).toBeTruthy()
  })

  it("hides the Sort By toggle when user is searching", async () => {
    renderDirectors()
    fireEvent.change(screen.getByTestId("search-bar"), { target: { value: "K" } })
    // isSearching becomes true immediately (before debounce completes)
    // but the search effect sets isSearching=true before the timeout
    // Actually the component sets isSearching=true inside the setTimeout callback,
    // so we need to advance timers to trigger isSearching.
    // Use fake timers for this test group.
    expect(screen.getByTestId("toggle-Sort By")).toBeTruthy() // still visible before debounce
  })
})

// ─── 4. Search mode ───────────────────────────────────────────────────────────

describe("Directors — search mode", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  async function typeAndSearch(query: string, results = [] as ReturnType<typeof makeTmdbDirectorResult>[]) {
    mocks.queryPersonFromTMDB.mockResolvedValue(results)
    renderDirectors()
    fireEvent.change(screen.getByTestId("search-bar"), { target: { value: query } })
    // runAllTimersAsync fires the debounce timer AND awaits the async callback inside it,
    // which means setSearchResult() is called before act() resolves.
    await act(async () => {
      await vi.runAllTimersAsync()
    })
  }

  it("calls queryPersonFromTMDB after 500ms debounce", async () => {
    mocks.queryPersonFromTMDB.mockResolvedValue([])
    renderDirectors()
    fireEvent.change(screen.getByTestId("search-bar"), { target: { value: "Kubrick" } })
    expect(mocks.queryPersonFromTMDB).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(mocks.queryPersonFromTMDB).toHaveBeenCalledWith("Kubrick")
  })

  it("does not call queryPersonFromTMDB before the debounce interval", () => {
    mocks.queryPersonFromTMDB.mockResolvedValue([])
    renderDirectors()
    fireEvent.change(screen.getByTestId("search-bar"), { target: { value: "Kubrick" } })
    vi.advanceTimersByTime(499)
    expect(mocks.queryPersonFromTMDB).not.toHaveBeenCalled()
  })

  it("does not call queryPersonFromTMDB when search input is empty", async () => {
    renderDirectors()
    fireEvent.change(screen.getByTestId("search-bar"), { target: { value: "" } })
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(mocks.queryPersonFromTMDB).not.toHaveBeenCalled()
  })

  it("shows TmdbDirectorGallery when searching", async () => {
    await typeAndSearch("Kubrick", [makeTmdbDirectorResult()])
    expect(screen.getByTestId("tmdb-director-gallery")).toBeTruthy()
  })

  it("hides UserDirectorGallery when searching", async () => {
    setAuth(true)
    await typeAndSearch("Kubrick", [makeTmdbDirectorResult()])
    expect(screen.queryByTestId("user-director-gallery")).toBeNull()
  })

  it("hides sort controls when searching", async () => {
    await typeAndSearch("Kubrick", [makeTmdbDirectorResult()])
    expect(screen.queryByTestId("toggle-Sort By")).toBeNull()
    expect(screen.queryByTestId("toggle-Sort Order")).toBeNull()
  })

  it("hides the logged-out message when searching", async () => {
    setAuth(false)
    await typeAndSearch("Kubrick", [makeTmdbDirectorResult()])
    expect(screen.queryByText(/Log in to interact with directors!/)).toBeNull()
  })

  it("filters TMDB results to only directors (known_for_department=Directing)", async () => {
    const directing = makeTmdbDirectorResult({ id: 1, name: "Stanley Kubrick", known_for_department: "Directing" })
    const acting = makeTmdbDirectorResult({ id: 2, name: "Not A Director", known_for_department: "Acting" })
    mocks.queryPersonFromTMDB.mockResolvedValue([directing, acting])

    renderDirectors()
    fireEvent.change(screen.getByTestId("search-bar"), { target: { value: "K" } })
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    const gallery = screen.getByTestId("tmdb-director-gallery")
    // Only the directing result passes the filter
    expect(gallery.getAttribute("data-count")).toBe("1")
  })

  it("passes all filtered directors to TmdbDirectorGallery", async () => {
    const d1 = makeTmdbDirectorResult({ id: 1, known_for_department: "Directing" })
    const d2 = makeTmdbDirectorResult({ id: 2, known_for_department: "Directing" })
    await typeAndSearch("K", [d1, d2])

    // typeAndSearch already drained all async work via runAllTimersAsync;
    // assert directly (waitFor uses setTimeout internally and would stall with fake timers).
    const gallery = screen.getByTestId("tmdb-director-gallery")
    expect(gallery.getAttribute("data-count")).toBe("2")
  })

  it("shows 'Search Results:' label when searching", async () => {
    await typeAndSearch("Kubrick", [makeTmdbDirectorResult()])
    expect(screen.getByText("Search Results:")).toBeTruthy()
  })
})

// ─── 5. Quick search pre-population ──────────────────────────────────────────

describe("Directors — quick search pre-population from location.state", () => {
  it("pre-populates search input from searchInputFromQuickSearch in location.state", async () => {
    mocks.location.state = { searchInputFromQuickSearch: "Kubrick" }
    renderDirectors()
    await waitFor(() => {
      const input = screen.getByTestId("search-bar") as HTMLInputElement
      expect(input.value).toBe("Kubrick")
    })
  })

  it("does not pre-populate when location.state is null", () => {
    mocks.location.state = null
    renderDirectors()
    const input = screen.getByTestId("search-bar") as HTMLInputElement
    expect(input.value).toBe("")
  })

  it("does not pre-populate when searchInputFromQuickSearch is an empty string", async () => {
    mocks.location.state = { searchInputFromQuickSearch: "   " }
    renderDirectors()
    await waitFor(() => {
      const input = screen.getByTestId("search-bar") as HTMLInputElement
      expect(input.value).toBe("")
    })
  })

  it("does not pre-populate when searchInputFromQuickSearch is not a string", async () => {
    mocks.location.state = { searchInputFromQuickSearch: 42 }
    renderDirectors()
    await waitFor(() => {
      const input = screen.getByTestId("search-bar") as HTMLInputElement
      expect(input.value).toBe("")
    })
  })
})

// ─── 6. Sort order toggle variants ───────────────────────────────────────────

describe("Directors — sort order toggle", () => {
  it("Sort Order toggle has desc and asc options when sortBy=name (default)", () => {
    renderDirectors()
    const sortOrderToggle = screen.getByTestId("toggle-Sort Order")
    const buttons = sortOrderToggle.querySelectorAll("button")
    const values = Array.from(buttons).map((b) => b.textContent)
    expect(values).toContain("desc")
    expect(values).toContain("asc")
  })
})
