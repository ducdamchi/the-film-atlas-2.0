import { render, screen, fireEvent } from "@testing-library/react"
import { Provider } from "jotai"
import { createStore } from "jotai"
import DiscoverControls from "./DiscoverControls"
import {
  map_discoverSortAtom,
  map_discoverFilterAtom,
  map_ratingAtom,
  map_votesAtom,
} from "@/atoms/mapAtoms"

// CustomSlider wraps react-range-slider-input which has no jsdom support
vi.mock("@/components/ui-custom/CustomSlider", () => ({
  default: () => <div data-testid="custom-slider" />,
}))

let store: ReturnType<typeof createStore>

beforeEach(() => {
  store = createStore()
  store.set(map_discoverSortAtom, "random")
  store.set(map_discoverFilterAtom, "recommended")
  store.set(map_ratingAtom, 0)
  store.set(map_votesAtom, 0)
})

function renderControls(isoA2?: string) {
  return render(
    <Provider store={store}>
      <DiscoverControls isoA2={isoA2} />
    </Provider>
  )
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("DiscoverControls — rendering", () => {
  it("renders the Sort By label", () => {
    renderControls()
    expect(screen.getByText("Sort By")).toBeTruthy()
  })

  it("renders all three sort options", () => {
    renderControls()
    expect(screen.getByRole("button", { name: "Random" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Top Rated" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Most Voted" })).toBeTruthy()
  })

  it("renders the Filter label", () => {
    renderControls()
    expect(screen.getByText("Filter")).toBeTruthy()
  })

  it("renders both filter options", () => {
    renderControls()
    expect(screen.getByRole("button", { name: "Recommended" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Custom" })).toBeTruthy()
  })

  it("'Random' sort is active by default", () => {
    renderControls()
    expect(
      screen.getByRole("button", { name: "Random" }).className
    ).toContain("font-semibold")
  })

  it("'Recommended' filter is active by default", () => {
    renderControls()
    expect(
      screen.getByRole("button", { name: "Recommended" }).className
    ).toContain("font-semibold")
  })

  it("slider panel is hidden when filter is 'Recommended'", () => {
    renderControls()
    expect(screen.queryByText(/average rating/i)).toBeNull()
    expect(screen.queryByText(/vote count/i)).toBeNull()
  })
})

// ─── Sort interaction ─────────────────────────────────────────────────────────

describe("DiscoverControls — sort interaction", () => {
  it("clicking 'Top Rated' updates the sort atom", () => {
    renderControls()
    fireEvent.click(screen.getByRole("button", { name: "Top Rated" }))
    expect(store.get(map_discoverSortAtom)).toBe("vote_average.desc")
  })

  it("clicking 'Most Voted' updates the sort atom", () => {
    renderControls()
    fireEvent.click(screen.getByRole("button", { name: "Most Voted" }))
    expect(store.get(map_discoverSortAtom)).toBe("vote_count.desc")
  })

  it("clicking 'Top Rated' makes it the active button", () => {
    renderControls()
    fireEvent.click(screen.getByRole("button", { name: "Top Rated" }))
    expect(
      screen.getByRole("button", { name: "Top Rated" }).className
    ).toContain("font-semibold")
    expect(
      screen.getByRole("button", { name: "Random" }).className
    ).not.toContain("font-semibold")
  })
})

// ─── Filter interaction ───────────────────────────────────────────────────────

describe("DiscoverControls — filter interaction", () => {
  it("switching to 'Custom' updates the filter atom", () => {
    renderControls()
    fireEvent.click(screen.getByRole("button", { name: "Custom" }))
    expect(store.get(map_discoverFilterAtom)).toBe("custom")
  })

  it("switching to 'Custom' reveals the slider panel", () => {
    renderControls()
    fireEvent.click(screen.getByRole("button", { name: "Custom" }))
    expect(screen.getByText(/average rating/i)).toBeTruthy()
    expect(screen.getByText(/vote count/i)).toBeTruthy()
  })

  it("seeds COUNTRY_DEFAULTS for a known country when switching to 'Custom'", () => {
    renderControls("US") // US → { rating: 7.0, voteCount: 200 }
    fireEvent.click(screen.getByRole("button", { name: "Custom" }))
    expect(store.get(map_ratingAtom)).toBe(7.0)
    expect(store.get(map_votesAtom)).toBe(200)
  })

  it("seeds GLOBAL_DEFAULTS when isoA2 is not in the table", () => {
    renderControls("XX") // unknown → { rating: 0, voteCount: 0 }
    fireEvent.click(screen.getByRole("button", { name: "Custom" }))
    expect(store.get(map_ratingAtom)).toBe(0)
    expect(store.get(map_votesAtom)).toBe(0)
  })

  it("seeds GLOBAL_DEFAULTS when isoA2 is undefined", () => {
    renderControls(undefined) // no country selected
    fireEvent.click(screen.getByRole("button", { name: "Custom" }))
    expect(store.get(map_ratingAtom)).toBe(0)
    expect(store.get(map_votesAtom)).toBe(0)
  })

  it("switching back to 'Recommended' hides the slider panel", () => {
    store.set(map_discoverFilterAtom, "custom")
    renderControls()
    fireEvent.click(screen.getByRole("button", { name: "Recommended" }))
    expect(screen.queryByText(/average rating/i)).toBeNull()
  })
})
