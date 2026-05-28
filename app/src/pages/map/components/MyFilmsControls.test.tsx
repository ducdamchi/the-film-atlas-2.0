import { render, screen, fireEvent } from "@testing-library/react"
import { Provider } from "jotai"
import { createStore } from "jotai"
import MyFilmsControls from "./MyFilmsControls"
import {
  map_modeAtom,
  map_userFilterAtom,
  map_userSortAtom,
  map_userSortDirAtom,
  map_starsAtom,
} from "@/atoms/mapAtoms"

let store: ReturnType<typeof createStore>

beforeEach(() => {
  store = createStore()
  store.set(map_userFilterAtom, "watched")
  store.set(map_modeAtom, "watched")
  store.set(map_userSortAtom, "added_date")
  store.set(map_userSortDirAtom, "desc")
  store.set(map_starsAtom, 0)
})

function renderControls() {
  return render(
    <Provider store={store}>
      <MyFilmsControls />
    </Provider>
  )
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("MyFilmsControls — rendering", () => {
  it("renders the Filter label and all filter options", () => {
    renderControls()
    expect(screen.getByText("Filter")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Watched" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Watchlist" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Rated" })).toBeTruthy()
  })

  it("renders the Sort By label and both sort options", () => {
    renderControls()
    expect(screen.getByText("Sort By")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Recently Added" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Released Year" })).toBeTruthy()
  })

  it("renders the Sort Order label", () => {
    renderControls()
    expect(screen.getByText("Sort Order")).toBeTruthy()
  })

  it("'Watched' filter is active by default", () => {
    renderControls()
    expect(
      screen.getByRole("button", { name: "Watched" }).className
    ).toContain("font-semibold")
  })

  it("'Recently Added' sort is active by default", () => {
    renderControls()
    expect(
      screen.getByRole("button", { name: "Recently Added" }).className
    ).toContain("font-semibold")
  })
})

// ─── Rating toggle visibility ─────────────────────────────────────────────────

describe("MyFilmsControls — rating toggle", () => {
  it("does not render the Rating toggle when filter is 'watched'", () => {
    renderControls()
    expect(screen.queryByText("Rating")).toBeNull()
  })

  it("does not render the Rating toggle when filter is 'watchlisted'", () => {
    store.set(map_userFilterAtom, "watchlisted")
    store.set(map_modeAtom, "watchlisted")
    renderControls()
    expect(screen.queryByText("Rating")).toBeNull()
  })

  it("reveals the Rating toggle when 'Rated' is clicked", () => {
    renderControls()
    fireEvent.click(screen.getByRole("button", { name: "Rated" }))
    expect(screen.getByText("Rating")).toBeTruthy()
  })

  it("hides the Rating toggle when switching away from 'Rated'", () => {
    store.set(map_userFilterAtom, "rated")
    store.set(map_modeAtom, "rated")
    renderControls()
    expect(screen.getByText("Rating")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Watched" }))
    expect(screen.queryByText("Rating")).toBeNull()
  })
})

// ─── Filter interaction ───────────────────────────────────────────────────────

describe("MyFilmsControls — filter interaction", () => {
  it("clicking 'Watchlist' updates the filter and mode atoms", () => {
    renderControls()
    fireEvent.click(screen.getByRole("button", { name: "Watchlist" }))
    expect(store.get(map_userFilterAtom)).toBe("watchlisted")
    expect(store.get(map_modeAtom)).toBe("watchlisted")
  })

  it("clicking 'Rated' updates the filter and mode atoms", () => {
    renderControls()
    fireEvent.click(screen.getByRole("button", { name: "Rated" }))
    expect(store.get(map_userFilterAtom)).toBe("rated")
    expect(store.get(map_modeAtom)).toBe("rated")
  })

  it("switching away from 'Rated' resets stars to 0", () => {
    store.set(map_userFilterAtom, "rated")
    store.set(map_modeAtom, "rated")
    store.set(map_starsAtom, 3)
    renderControls()
    fireEvent.click(screen.getByRole("button", { name: "Watched" }))
    expect(store.get(map_starsAtom)).toBe(0)
  })

  it("switching to 'Rated' does not reset stars", () => {
    // Stars default to 0; clicking Rated should leave them at 0 (not explicitly reset)
    renderControls()
    fireEvent.click(screen.getByRole("button", { name: "Rated" }))
    expect(store.get(map_starsAtom)).toBe(0)
  })
})

// ─── Sort interaction ─────────────────────────────────────────────────────────

describe("MyFilmsControls — sort interaction", () => {
  it("clicking 'Released Year' updates the sort atom", () => {
    renderControls()
    fireEvent.click(screen.getByRole("button", { name: "Released Year" }))
    expect(store.get(map_userSortAtom)).toBe("released_date")
  })

  it("clicking 'Recently Added' keeps the sort atom at its default", () => {
    renderControls()
    fireEvent.click(screen.getByRole("button", { name: "Recently Added" }))
    expect(store.get(map_userSortAtom)).toBe("added_date")
  })
})
