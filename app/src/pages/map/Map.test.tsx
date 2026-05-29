/* Libraries */
import { render, screen, fireEvent } from "@testing-library/react"
import { Provider, createStore } from "jotai"

/* Mocks — hoisted before imports by Vitest */
vi.mock("@maptiler/sdk/dist/maptiler-sdk.css", () => ({}))
vi.mock("react-range-slider-input/dist/style.css", () => ({}))

vi.mock("react-map-gl/maplibre", () => ({
  Map: vi.fn(({ children }: { children: React.ReactNode }) => (
    <div data-testid="mapgl">{children}</div>
  )),
  Popup: vi.fn(
    ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
      <div data-testid="popup">
        <button onClick={onClose}>close</button>
        {children}
      </div>
    ),
  ),
  NavigationControl: () => null,
}))

vi.mock("./MapCountriesLayer", () => ({ default: () => null }))

vi.mock("@/hooks/useMapFilmData", () => ({
  useMapFilmData: vi.fn(() => ({ filmsPerCountryData: {} })),
}))
vi.mock("@/hooks/useMapInteraction", () => ({
  useMapInteraction: vi.fn(() => ({
    mapRef: { current: null },
    firstSymbolId: null,
    isMapLoaded: false,
    popupInfo: null,
    setPopupInfo: vi.fn(),
    onMapLoad: vi.fn(),
    onMapClick: vi.fn(),
  })),
}))
vi.mock("@/hooks/useDiscoverFilms", () => ({
  useDiscoverFilms: vi.fn(() => ({
    suggestedFilmList: [],
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    loadMoreTrigger: { current: null },
  })),
}))
vi.mock("@/hooks/useUserFilms", () => ({
  useUserFilms: vi.fn(() => ({ userFilmList: [], isLoading: false })),
}))
vi.mock("@/hooks/useMapPanel", () => ({
  useMapPanel: vi.fn(() => ({
    panelRef: { current: null },
    mapContainerRef: { current: null },
    showPanel: false,
    setShowPanel: vi.fn(),
    sidebarWidth: 448,
    isMobile: false,
    onDragHandlePointerDown: vi.fn(),
    handleDragAreaClick: vi.fn(),
  })),
}))

vi.mock("./components/DiscoverControls", () => ({
  default: ({ isoA2 }: { isoA2?: string }) => (
    <div data-testid="discover-controls" data-iso={isoA2 ?? ""} />
  ),
}))
vi.mock("./components/MyFilmsControls", () => ({
  default: () => <div data-testid="my-films-controls" />,
}))
vi.mock("../../components/film/TmdbFilmGallery", () => ({
  default: ({
    listOfFilmObjects,
    isLoading,
  }: {
    listOfFilmObjects: unknown[]
    isLoading: boolean
  }) => (
    <div
      data-testid="tmdb-gallery"
      data-count={listOfFilmObjects.length}
      data-loading={String(isLoading)}
    />
  ),
}))
vi.mock("../../components/film/UserFilmGallery", () => ({
  default: ({
    listOfFilmObjects,
    queryString,
  }: {
    listOfFilmObjects: unknown[]
    queryString: string
  }) => (
    <div
      data-testid="user-gallery"
      data-count={listOfFilmObjects.length}
      data-qs={queryString}
    />
  ),
}))
vi.mock("./components/MapUnavailable", () => ({
  MapUnavailable: () => <div data-testid="map-unavailable" />,
}))

vi.mock("@/utils/helperFunctions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/helperFunctions")>()
  return { ...actual, checkWebGLSupport: vi.fn(() => true) }
})

vi.mock("@/routes/map", () => ({
  Route: { useSearch: vi.fn(() => ({ country: undefined })) },
}))

const mockNavigate = vi.fn()
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

/* Project imports (after vi.mock hoisting) */
import Map from "./Map"
import { AuthContext } from "@/utils/authContext"
import { map_modeAtom, map_userFilterAtom } from "@/atoms/mapAtoms"
import { useMapInteraction } from "@/hooks/useMapInteraction"
import { useDiscoverFilms } from "@/hooks/useDiscoverFilms"
import { checkWebGLSupport } from "@/utils/helperFunctions"
import { Route } from "@/routes/map"
import { makeTmdbSummary } from "../../components/film/__fixtures__/film"
import type { AuthContextValue } from "@/types/auth"
import type { PopupInfo } from "@/types/map"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAuthValue(loggedIn: boolean): AuthContextValue {
  return {
    authState: {
      status: loggedIn,
      username: loggedIn ? "testuser" : "",
      id: loggedIn ? "u1" : "",
      email: null,
      locationCountry: null,
      locationCity: null,
      locationSource: null,
    },
    setAuthState: vi.fn(),
    authLoading: false,
  }
}

interface RenderMapOptions {
  loggedIn?: boolean
  country?: string
  store?: ReturnType<typeof createStore>
}

function renderMap({ loggedIn = false, country, store }: RenderMapOptions = {}) {
  vi.mocked(Route.useSearch).mockReturnValue({ country })
  const jotaiStore = store ?? createStore()
  const result = render(
    <Provider store={jotaiStore}>
      <AuthContext.Provider value={makeAuthValue(loggedIn)}>
        <Map />
      </AuthContext.Provider>
    </Provider>,
  )
  return { ...result, jotaiStore }
}

// Shared baseline for useMapInteraction — spread and override per-test
const baseInteraction = {
  mapRef: { current: null } as React.MutableRefObject<null>,
  firstSymbolId: null as string | null,
  isMapLoaded: false,
  popupInfo: null as PopupInfo | null,
  setPopupInfo: vi.fn() as unknown as React.Dispatch<React.SetStateAction<PopupInfo | null>>,
  onMapLoad: vi.fn() as unknown as (event: { target: unknown }) => void,
  onMapClick: vi.fn() as unknown as (event: unknown) => void,
}

// Shared baseline for useDiscoverFilms
const baseDiscover = {
  suggestedFilmList: [] as ReturnType<typeof makeTmdbSummary>[],
  isLoading: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  loadMoreTrigger: { current: null } as React.RefObject<HTMLDivElement | null>,
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(checkWebGLSupport).mockReturnValue(true)
  vi.mocked(useMapInteraction).mockReturnValue({ ...baseInteraction })
  vi.mocked(useDiscoverFilms).mockReturnValue({ ...baseDiscover })
})

// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1. WebGL gate ────────────────────────────────────────────────────────────

describe("Map — WebGL gate", () => {
  it("renders the MapGL shell when WebGL is supported", () => {
    renderMap()
    expect(screen.getByTestId("mapgl")).toBeTruthy()
    expect(screen.queryByTestId("map-unavailable")).toBeNull()
  })

  it("renders MapUnavailable (not MapGL) when checkWebGLSupport returns false", () => {
    vi.mocked(checkWebGLSupport).mockReturnValue(false)
    renderMap()
    expect(screen.getByTestId("map-unavailable")).toBeTruthy()
    expect(screen.queryByTestId("mapgl")).toBeNull()
  })
})

// ─── 2. Panel header — country display ───────────────────────────────────────

describe("Map — panel header", () => {
  it("shows 'select region on map' when no country param and popupInfo is null", () => {
    renderMap()
    expect(screen.getByText("select region on map")).toBeTruthy()
  })

  it("shows the country name when a country URL param is set", () => {
    // Real getCountryName is preserved in the partial mock — "JP" → "Japan"
    renderMap({ country: "JP" })
    expect(screen.getByText("Japan")).toBeTruthy()
    expect(screen.queryByText("select region on map")).toBeNull()
  })

  it("shows the country name from popupInfo.iso_a2 when popupInfo is non-null", () => {
    vi.mocked(useMapInteraction).mockReturnValue({
      ...baseInteraction,
      popupInfo: {
        longitude: 139.69, latitude: 35.68,
        num_watched_films: 0, country_name: "Japan",
        custom_name: undefined, iso_a2: "JP",
      },
    })
    renderMap()
    // "Japan" appears in both the panel header and the popup — at least one occurrence is correct
    expect(screen.getAllByText("Japan").length).toBeGreaterThan(0)
  })

  it("popupInfo.iso_a2 takes precedence over the URL country param", () => {
    // isoA2 = popupInfo?.iso_a2 ?? country — popup wins when both are set
    vi.mocked(useMapInteraction).mockReturnValue({
      ...baseInteraction,
      popupInfo: {
        longitude: 2.35, latitude: 48.85,
        num_watched_films: 0, country_name: "France",
        custom_name: undefined, iso_a2: "FR",
      },
    })
    renderMap({ country: "JP" })
    // "France" (from "FR") appears in header + popup; "Japan" (from "JP" URL param) does not
    expect(screen.getAllByText("France").length).toBeGreaterThan(0)
    expect(screen.queryByText("Japan")).toBeNull()
  })
})

// ─── 3. Browse toggle ─────────────────────────────────────────────────────────

describe("Map — browse toggle", () => {
  it("renders both 'Discover' and 'My Films' toggle options", () => {
    renderMap()
    expect(screen.getByRole("button", { name: "Discover" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "My Films" })).toBeTruthy()
  })

  it("clicking 'My Films' sets map_modeAtom to the current map_userFilterAtom value", () => {
    const store = createStore()
    store.set(map_userFilterAtom, "watchlisted") // remember last my-films sub-mode
    const { jotaiStore } = renderMap({ store })
    fireEvent.click(screen.getByRole("button", { name: "My Films" }))
    expect(jotaiStore.get(map_modeAtom)).toBe("watchlisted")
  })

  it("clicking 'My Films' defaults to 'watched' when userFilterAtom is at its default", () => {
    // map_userFilterAtom default is "watched"
    const { jotaiStore } = renderMap()
    fireEvent.click(screen.getByRole("button", { name: "My Films" }))
    expect(jotaiStore.get(map_modeAtom)).toBe("watched")
  })

  it("clicking 'Discover' sets map_modeAtom to 'discover'", () => {
    const store = createStore()
    store.set(map_modeAtom, "watched")
    const { jotaiStore } = renderMap({ store })
    fireEvent.click(screen.getByRole("button", { name: "Discover" }))
    expect(jotaiStore.get(map_modeAtom)).toBe("discover")
  })
})

// ─── 4. Controls routing ──────────────────────────────────────────────────────

describe("Map — controls routing", () => {
  it("renders DiscoverControls (not MyFilmsControls) in discover mode", () => {
    renderMap()
    expect(screen.getByTestId("discover-controls")).toBeTruthy()
    expect(screen.queryByTestId("my-films-controls")).toBeNull()
  })

  it("passes isoA2 as a prop to DiscoverControls", () => {
    renderMap({ country: "JP" })
    expect(screen.getByTestId("discover-controls").getAttribute("data-iso")).toBe("JP")
  })

  it("passes empty isoA2 to DiscoverControls when no country is selected", () => {
    renderMap()
    expect(screen.getByTestId("discover-controls").getAttribute("data-iso")).toBe("")
  })

  it("renders MyFilmsControls (not DiscoverControls) when mode is not discover", () => {
    const store = createStore()
    store.set(map_modeAtom, "watched")
    renderMap({ store })
    expect(screen.getByTestId("my-films-controls")).toBeTruthy()
    expect(screen.queryByTestId("discover-controls")).toBeNull()
  })
})

// ─── 5. Gallery routing ───────────────────────────────────────────────────────

describe("Map — gallery routing", () => {
  it("renders TmdbFilmGallery (not UserFilmGallery) in discover mode", () => {
    renderMap()
    expect(screen.getByTestId("tmdb-gallery")).toBeTruthy()
    expect(screen.queryByTestId("user-gallery")).toBeNull()
  })

  it("renders UserFilmGallery (not TmdbFilmGallery) when mode≠discover and logged in", () => {
    const store = createStore()
    store.set(map_modeAtom, "watched")
    renderMap({ loggedIn: true, store })
    expect(screen.getByTestId("user-gallery")).toBeTruthy()
    expect(screen.queryByTestId("tmdb-gallery")).toBeNull()
  })

  it("shows the logged-out message (not UserFilmGallery) when mode≠discover and unauthenticated", () => {
    const store = createStore()
    store.set(map_modeAtom, "watched")
    renderMap({ loggedIn: false, store })
    expect(screen.getByText(/Log in and like a film to start!/)).toBeTruthy()
    expect(screen.queryByTestId("user-gallery")).toBeNull()
  })

  it("does not show the logged-out message in discover mode", () => {
    renderMap({ loggedIn: false })
    expect(screen.queryByText(/Log in and like a film to start!/)).toBeNull()
  })
})

// ─── 6. galleryQueryString derivation ────────────────────────────────────────

describe("Map — galleryQueryString", () => {
  function renderMyFilms(mode: "watched" | "watchlisted" | "rated") {
    const store = createStore()
    store.set(map_modeAtom, mode)
    return renderMap({ loggedIn: true, store })
  }

  it("passes queryString='watched' to UserFilmGallery when mode='watched'", () => {
    renderMyFilms("watched")
    expect(screen.getByTestId("user-gallery").getAttribute("data-qs")).toBe("watched")
  })

  it("passes queryString='watchlisted' to UserFilmGallery when mode='watchlisted'", () => {
    renderMyFilms("watchlisted")
    expect(screen.getByTestId("user-gallery").getAttribute("data-qs")).toBe("watchlisted")
  })

  it("passes queryString='watched/rated' to UserFilmGallery when mode='rated'", () => {
    renderMyFilms("rated")
    expect(screen.getByTestId("user-gallery").getAttribute("data-qs")).toBe("watched/rated")
  })
})

// ─── 7. Popup content ─────────────────────────────────────────────────────────

describe("Map — popup content", () => {
  const japanPopup: PopupInfo = {
    longitude: 139.69, latitude: 35.68,
    num_watched_films: 5, country_name: "Japan",
    custom_name: undefined, iso_a2: "JP",
  }

  it("does not render popup when popupInfo is null", () => {
    renderMap()
    expect(screen.queryByTestId("popup")).toBeNull()
  })

  it("renders popup when popupInfo is non-null", () => {
    vi.mocked(useMapInteraction).mockReturnValue({ ...baseInteraction, popupInfo: japanPopup })
    renderMap()
    expect(screen.getByTestId("popup")).toBeTruthy()
  })

  it("shows country_name in popup when custom_name is undefined", () => {
    vi.mocked(useMapInteraction).mockReturnValue({ ...baseInteraction, popupInfo: japanPopup })
    renderMap()
    // "Japan" appears in both the popup and the panel header (isoA2="JP" drives both)
    expect(screen.getAllByText("Japan").length).toBeGreaterThan(0)
  })

  it("shows custom_name (not country_name) when custom_name is defined", () => {
    // Map.tsx: {custom_name !== undefined && <span>{custom_name}</span>}
    //          {custom_name === undefined && <span>{country_name}</span>}
    vi.mocked(useMapInteraction).mockReturnValue({
      ...baseInteraction,
      popupInfo: {
        longitude: 35.2, latitude: 31.9,
        num_watched_films: 2, country_name: "Israel",
        custom_name: "Palestine", iso_a2: "PS",
      },
    })
    renderMap()
    expect(screen.getByText("Palestine")).toBeTruthy()
    expect(screen.queryByText("Israel")).toBeNull()
  })

  it("shows num_watched_films count and 'watched films' label in popup", () => {
    vi.mocked(useMapInteraction).mockReturnValue({ ...baseInteraction, popupInfo: { ...japanPopup, num_watched_films: 7 } })
    renderMap()
    expect(screen.getByText("7")).toBeTruthy()
    expect(screen.getByText("watched films")).toBeTruthy()
  })
})

// ─── 8. Infinite scroll UI ────────────────────────────────────────────────────

describe("Map — infinite scroll UI", () => {
  it("renders the spinner when isFetchingNextPage=true and list is non-empty", () => {
    vi.mocked(useDiscoverFilms).mockReturnValue({
      suggestedFilmList: [makeTmdbSummary()],
      isLoading: false,
      isFetchingNextPage: true,
      hasNextPage: true,
      loadMoreTrigger: { current: null },
    })
    renderMap()
    // Spinner renders with role="status" aria-label="Loading"
    expect(screen.getByRole("status")).toBeTruthy()
  })

  it("does not render the spinner when the film list is empty", () => {
    vi.mocked(useDiscoverFilms).mockReturnValue({
      ...baseDiscover,
      isFetchingNextPage: true,
      suggestedFilmList: [],
    })
    renderMap()
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("renders 'You've reached the end!' when hasNextPage=false and list is non-empty", () => {
    vi.mocked(useDiscoverFilms).mockReturnValue({
      suggestedFilmList: [makeTmdbSummary()],
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      loadMoreTrigger: { current: null },
    })
    renderMap()
    expect(screen.getByText("You've reached the end!")).toBeTruthy()
  })

  it("does not render 'You've reached the end!' when list is empty", () => {
    vi.mocked(useDiscoverFilms).mockReturnValue({
      ...baseDiscover,
      hasNextPage: false,
      suggestedFilmList: [],
    })
    renderMap()
    expect(screen.queryByText("You've reached the end!")).toBeNull()
  })

  it("renders the load-more sentinel div when hasNextPage=true and list is non-empty", () => {
    vi.mocked(useDiscoverFilms).mockReturnValue({
      suggestedFilmList: [makeTmdbSummary()],
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: true,
      loadMoreTrigger: { current: null },
    })
    const { container } = renderMap()
    // sentinel: <div ref={loadMoreTrigger} className="w-full h-px mt-20" />
    expect(container.querySelector(".h-px.mt-20")).toBeTruthy()
  })

  it("does not render the sentinel div when list is empty", () => {
    vi.mocked(useDiscoverFilms).mockReturnValue({
      ...baseDiscover,
      hasNextPage: true,
      suggestedFilmList: [],
    })
    const { container } = renderMap()
    expect(container.querySelector(".h-px.mt-20")).toBeNull()
  })
})
