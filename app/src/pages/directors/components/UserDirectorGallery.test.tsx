import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import UserDirectorGallery from "./UserDirectorGallery"
import { makeDirector, makeDirectorStats } from "./__fixtures__/director"
import type { Director } from "@/types/film"

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

beforeEach(() => mockNavigate.mockClear())

// ─── Fixtures ─────────────────────────────────────────────────────────────────

// computeDirectorScore({ num_watched_films:5, num_starred_films:2, num_stars_total:4 })
//   watchScore = min(1, log(6)/log(10)) ≈ 0.778
//   score = (4/2)*2 + 0.778*4 ≈ 7.11 → group key "7"
const directorA: Director = makeDirector({
  id: 1,
  name: "Akira Kurosawa",
  profile_path: "/kurosawa.jpg",
  WatchedDirectors: makeDirectorStats({
    num_watched_films: 5,
    num_starred_films: 2,
    num_stars_total: 4,
    highest_star: 2,
  }),
})

// computeDirectorScore({ num_watched_films:1, num_starred_films:0, num_stars_total:0 })
//   watchScore = min(1, log(2)/log(10)) ≈ 0.301
//   score = 0.301 * 4 ≈ 1.20 → group key "1"
const directorB: Director = makeDirector({
  id: 2,
  name: "Bong Joon-ho",
  profile_path: "/bong.jpg",
  WatchedDirectors: makeDirectorStats({
    num_watched_films: 1,
    num_starred_films: 0,
    num_stars_total: 0,
    highest_star: 0,
  }),
})

const directorZ: Director = makeDirector({
  id: 3,
  name: "Zhang Yimou",
  profile_path: null,
  WatchedDirectors: makeDirectorStats({
    num_watched_films: 3,
    num_starred_films: 1,
    num_stars_total: 3,
    highest_star: 3,
  }),
})

const defaultProps = {
  sortBy: "name" as const,
  sortDirection: "desc" as const,
}

// ─── Empty state ──────────────────────────────────────────────────────────────

describe("UserDirectorGallery — empty state", () => {
  it("renders 'No directors found.' when list is empty", () => {
    render(<UserDirectorGallery {...defaultProps} listOfDirectorObjects={[]} />)
    expect(screen.getByText("No directors found.")).toBeTruthy()
  })

  it("does not render any images when list is empty", () => {
    const { container } = render(
      <UserDirectorGallery {...defaultProps} listOfDirectorObjects={[]} />,
    )
    expect(container.querySelector("img")).toBeNull()
  })

  it("does not render 'No directors found.' when list is non-empty", async () => {
    render(
      <UserDirectorGallery
        {...defaultProps}
        listOfDirectorObjects={[directorA]}
      />,
    )
    await waitFor(() => {
      expect(screen.queryByText("No directors found.")).toBeNull()
    })
  })
})

// ─── Rendering — director cards ───────────────────────────────────────────────

describe("UserDirectorGallery — director card rendering", () => {
  it("renders each director's name", async () => {
    render(
      <UserDirectorGallery
        {...defaultProps}
        listOfDirectorObjects={[directorA, directorB]}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText("Akira Kurosawa")).toBeTruthy()
      expect(screen.getByText("Bong Joon-ho")).toBeTruthy()
    })
  })

  it("renders a profile image for each director", async () => {
    const { container } = render(
      <UserDirectorGallery
        {...defaultProps}
        listOfDirectorObjects={[directorA, directorB]}
      />,
    )
    await waitFor(() => {
      expect(container.querySelectorAll("img")).toHaveLength(2)
    })
  })

  it("uses TMDB base URL + profile_path when profile_path is set", async () => {
    const { container } = render(
      <UserDirectorGallery
        {...defaultProps}
        listOfDirectorObjects={[directorA]}
      />,
    )
    await waitFor(() => {
      const img = container.querySelector("img")!
      expect(img.src).toContain("/kurosawa.jpg")
    })
  })

  it("uses /picnotfound.jpg when profile_path is null", async () => {
    const { container } = render(
      <UserDirectorGallery
        {...defaultProps}
        listOfDirectorObjects={[directorZ]}
      />,
    )
    await waitFor(() => {
      const img = container.querySelector("img")!
      expect(img.src).toContain("/picnotfound.jpg")
    })
  })
})

// ─── Grouping — name ──────────────────────────────────────────────────────────

describe("UserDirectorGallery — grouping by name", () => {
  it("renders a group label for the first letter of each director's name", async () => {
    render(
      <UserDirectorGallery
        sortBy="name"
        sortDirection="desc"
        listOfDirectorObjects={[directorA, directorB]}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText("A")).toBeTruthy()
      expect(screen.getByText("B")).toBeTruthy()
    })
  })

  it("places two directors with the same initial under one group label", async () => {
    const directorA2 = makeDirector({ id: 4, name: "Abbas Kiarostami" })
    render(
      <UserDirectorGallery
        sortBy="name"
        sortDirection="desc"
        listOfDirectorObjects={[directorA, directorA2]}
      />,
    )
    await waitFor(() => {
      // Only one "A" label
      expect(screen.getAllByText("A")).toHaveLength(1)
      expect(screen.getByText("Akira Kurosawa")).toBeTruthy()
      expect(screen.getByText("Abbas Kiarostami")).toBeTruthy()
    })
  })

  it("creates separate group labels for directors with different initials", async () => {
    render(
      <UserDirectorGallery
        sortBy="name"
        sortDirection="desc"
        listOfDirectorObjects={[directorA, directorB]}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText("A")).toBeTruthy()
      expect(screen.getByText("B")).toBeTruthy()
    })
  })
})

// ─── Grouping — score ─────────────────────────────────────────────────────────

describe("UserDirectorGallery — grouping by score", () => {
  it("renders group labels as score integer strings", async () => {
    render(
      <UserDirectorGallery
        sortBy="score"
        sortDirection="desc"
        listOfDirectorObjects={[directorA, directorB]}
      />,
    )
    await waitFor(() => {
      // directorA score ≈ 7.11 → "7"; directorB score ≈ 1.20 → "1"
      expect(screen.getByText("7")).toBeTruthy()
      expect(screen.getByText("1")).toBeTruthy()
    })
  })

  it("groups directors with similar scores under the same integer label", async () => {
    // Both will have score ≈ 1.x → same group "1"
    const low1 = makeDirector({
      id: 10,
      name: "Director One",
      WatchedDirectors: makeDirectorStats({
        num_watched_films: 1,
        num_starred_films: 0,
        num_stars_total: 0,
      }),
    })
    const low2 = makeDirector({
      id: 11,
      name: "Director Two",
      WatchedDirectors: makeDirectorStats({
        num_watched_films: 2,
        num_starred_films: 0,
        num_stars_total: 0,
      }),
    })
    render(
      <UserDirectorGallery
        sortBy="score"
        sortDirection="desc"
        listOfDirectorObjects={[low1, low2]}
      />,
    )
    await waitFor(() => {
      expect(screen.getAllByText("1")).toHaveLength(1)
      expect(screen.getByText("Director One")).toBeTruthy()
      expect(screen.getByText("Director Two")).toBeTruthy()
    })
  })
})

// ─── Grouping — highest_star ──────────────────────────────────────────────────

describe("UserDirectorGallery — grouping by highest_star", () => {
  it("renders star icon group labels (text-star class) for valid highest_star values", async () => {
    const { container } = render(
      <UserDirectorGallery
        sortBy="highest_star"
        sortDirection="desc"
        listOfDirectorObjects={[directorA, directorZ]}
      />,
    )
    await waitFor(() => {
      // directorA highest_star=2 → text-star; directorZ highest_star=3 → text-star
      const starLabels = container.querySelectorAll(".text-star")
      expect(starLabels.length).toBeGreaterThan(0)
    })
  })

  it("renders a dark star label (text-foreground class) for directors with highest_star=0", async () => {
    const { container } = render(
      <UserDirectorGallery
        sortBy="highest_star"
        sortDirection="desc"
        listOfDirectorObjects={[directorB]}
      />,
    )
    await waitFor(() => {
      expect(container.querySelector(".text-foreground")).toBeTruthy()
    })
  })

  it("groups directors with the same highest_star under one label", async () => {
    const twoStar1 = makeDirector({
      id: 20,
      name: "Director Alpha",
      WatchedDirectors: makeDirectorStats({ highest_star: 2 }),
    })
    const twoStar2 = makeDirector({
      id: 21,
      name: "Director Beta",
      WatchedDirectors: makeDirectorStats({ highest_star: 2 }),
    })
    const { container } = render(
      <UserDirectorGallery
        sortBy="highest_star"
        sortDirection="desc"
        listOfDirectorObjects={[twoStar1, twoStar2]}
      />,
    )
    await waitFor(() => {
      // Only one star-group label
      expect(container.querySelectorAll(".text-star")).toHaveLength(1)
      expect(screen.getByText("Director Alpha")).toBeTruthy()
      expect(screen.getByText("Director Beta")).toBeTruthy()
    })
  })

  it("skips directors with invalid highest_star values", async () => {
    const invalid = makeDirector({
      id: 99,
      name: "Invalid Director",
      WatchedDirectors: makeDirectorStats({ highest_star: 5 as any }),
    })
    render(
      <UserDirectorGallery
        sortBy="highest_star"
        sortDirection="desc"
        listOfDirectorObjects={[invalid]}
      />,
    )
    await waitFor(() => {
      expect(screen.queryByText("Invalid Director")).toBeNull()
    })
  })
})

// ─── Sort direction — name ────────────────────────────────────────────────────

describe("UserDirectorGallery — sort direction (name)", () => {
  it("desc: groups are ordered A before Z", async () => {
    render(
      <UserDirectorGallery
        sortBy="name"
        sortDirection="desc"
        listOfDirectorObjects={[directorZ, directorA]}
      />,
    )
    await waitFor(() => {
      const labels = screen.getAllByText(/^[ABZ]$/)
      const texts = labels.map((el) => el.textContent)
      expect(texts.indexOf("A")).toBeLessThan(texts.indexOf("Z"))
    })
  })

  it("asc: groups are ordered Z before A", async () => {
    render(
      <UserDirectorGallery
        sortBy="name"
        sortDirection="asc"
        listOfDirectorObjects={[directorA, directorZ]}
      />,
    )
    await waitFor(() => {
      const labels = screen.getAllByText(/^[AZ]$/)
      const texts = labels.map((el) => el.textContent)
      expect(texts.indexOf("Z")).toBeLessThan(texts.indexOf("A"))
    })
  })
})

// ─── Sort direction — score ───────────────────────────────────────────────────

describe("UserDirectorGallery — sort direction (score)", () => {
  it("desc: higher-score group appears before lower-score group", async () => {
    render(
      <UserDirectorGallery
        sortBy="score"
        sortDirection="desc"
        listOfDirectorObjects={[directorB, directorA]}
      />,
    )
    await waitFor(() => {
      const labels = screen.getAllByText(/^[17]$/)
      const texts = labels.map((el) => el.textContent)
      // group "7" (directorA) should come before group "1" (directorB)
      expect(texts.indexOf("7")).toBeLessThan(texts.indexOf("1"))
    })
  })

  it("asc: lower-score group appears before higher-score group", async () => {
    render(
      <UserDirectorGallery
        sortBy="score"
        sortDirection="asc"
        listOfDirectorObjects={[directorA, directorB]}
      />,
    )
    await waitFor(() => {
      const labels = screen.getAllByText(/^[17]$/)
      const texts = labels.map((el) => el.textContent)
      // group "1" (directorB) should come before group "7" (directorA)
      expect(texts.indexOf("1")).toBeLessThan(texts.indexOf("7"))
    })
  })
})

// ─── Sort direction — highest_star ────────────────────────────────────────────

describe("UserDirectorGallery — sort direction (highest_star)", () => {
  it("desc: 3-star group appears before 0-star group", async () => {
    const { container } = render(
      <UserDirectorGallery
        sortBy="highest_star"
        sortDirection="desc"
        listOfDirectorObjects={[directorB, directorZ]}
      />,
    )
    await waitFor(() => {
      // directorZ has highest_star=3 (text-star), directorB has highest_star=0 (text-foreground)
      const allLabels = container.querySelectorAll(
        "[class*='text-star'],[class*='text-foreground']",
      )
      expect(allLabels[0].className).toContain("text-star")
      expect(allLabels[1].className).toContain("text-foreground")
    })
  })

  it("asc: 0-star group appears before 3-star group", async () => {
    const { container } = render(
      <UserDirectorGallery
        sortBy="highest_star"
        sortDirection="asc"
        listOfDirectorObjects={[directorZ, directorB]}
      />,
    )
    await waitFor(() => {
      const allLabels = container.querySelectorAll(
        "[class*='text-star'],[class*='text-foreground']",
      )
      expect(allLabels[0].className).toContain("text-foreground")
      expect(allLabels[1].className).toContain("text-star")
    })
  })
})

// ─── Hover overlay ────────────────────────────────────────────────────────────

describe("UserDirectorGallery — hover overlay", () => {
  it("does not show the stats overlay before hovering", async () => {
    render(
      <UserDirectorGallery
        {...defaultProps}
        listOfDirectorObjects={[directorA]}
      />,
    )
    await waitFor(() => {
      expect(screen.queryByText(/Watched:/)).toBeNull()
    })
  })

  it("shows num_watched_films, num_starred_films and score on hover", async () => {
    const { container } = render(
      <UserDirectorGallery
        {...defaultProps}
        listOfDirectorObjects={[directorA]}
      />,
    )
    await waitFor(() => expect(screen.getByText("Akira Kurosawa")).toBeTruthy())

    // The hover target is the image container div
    const imageContainer = container.querySelector(
      ".relative.w-full.aspect-4\\/6",
    )!
    fireEvent.mouseEnter(imageContainer)

    await waitFor(() => {
      expect(
        screen.getByText(
          `Watched: ${directorA.WatchedDirectors.num_watched_films}`,
        ),
      ).toBeTruthy()
      expect(
        screen.getByText(
          `Starred: ${directorA.WatchedDirectors.num_starred_films}`,
        ),
      ).toBeTruthy()
      // Score line starts with "Score:"
      expect(screen.getByText(/^Score:/)).toBeTruthy()
    })
  })

  it("hides the stats overlay after mouse leave", async () => {
    const { container } = render(
      <UserDirectorGallery
        {...defaultProps}
        listOfDirectorObjects={[directorA]}
      />,
    )
    await waitFor(() => expect(screen.getByText("Akira Kurosawa")).toBeTruthy())

    const imageContainer = container.querySelector(
      ".relative.w-full.aspect-4\\/6",
    )!
    fireEvent.mouseEnter(imageContainer)
    await waitFor(() => expect(screen.getByText(/^Watched:/)).toBeTruthy())

    fireEvent.mouseLeave(imageContainer)
    await waitFor(() => {
      expect(screen.queryByText(/^Watched:/)).toBeNull()
    })
  })

  it("shows the correct score formatted to 2 decimal places", async () => {
    const { container } = render(
      <UserDirectorGallery
        {...defaultProps}
        listOfDirectorObjects={[directorA]}
      />,
    )
    await waitFor(() => expect(screen.getByText("Akira Kurosawa")).toBeTruthy())

    const imageContainer = container.querySelector(
      ".relative.w-full.aspect-4\\/6",
    )!
    fireEvent.mouseEnter(imageContainer)

    await waitFor(() => {
      const scoreEl = screen.getByText(/^Score:/)
      // score should be formatted as x.xx
      expect(scoreEl.textContent).toMatch(/Score: \d+\.\d{2}/)
    })
  })
})

// ─── Navigation ───────────────────────────────────────────────────────────────

describe("UserDirectorGallery — navigation", () => {
  it("clicking a director card navigates to /director/{id}", async () => {
    render(
      <UserDirectorGallery
        {...defaultProps}
        listOfDirectorObjects={[directorA]}
      />,
    )
    await waitFor(() => expect(screen.getByText("Akira Kurosawa")).toBeTruthy())

    fireEvent.click(screen.getByText("Akira Kurosawa"))
    expect(mockNavigate).toHaveBeenCalledWith({
      to: `/director/${directorA.id}`,
    })
  })

  it("clicking the correct director navigates to the right id when multiple directors are shown", async () => {
    render(
      <UserDirectorGallery
        {...defaultProps}
        listOfDirectorObjects={[directorA, directorB]}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText("Akira Kurosawa")).toBeTruthy()
      expect(screen.getByText("Bong Joon-ho")).toBeTruthy()
    })

    fireEvent.click(screen.getByText("Bong Joon-ho"))
    expect(mockNavigate).toHaveBeenCalledWith({
      to: `/director/${directorB.id}`,
    })
  })
})

// ─── Re-render on prop changes ────────────────────────────────────────────────

describe("UserDirectorGallery — re-renders when props change", () => {
  it("updates groups when sortBy prop changes from name to score", async () => {
    const { rerender } = render(
      <UserDirectorGallery
        sortBy="name"
        sortDirection="desc"
        listOfDirectorObjects={[directorA]}
      />,
    )
    await waitFor(() => expect(screen.getByText("A")).toBeTruthy())

    rerender(
      <UserDirectorGallery
        sortBy="score"
        sortDirection="desc"
        listOfDirectorObjects={[directorA]}
      />,
    )
    await waitFor(() => {
      expect(screen.queryByText("A")).toBeNull()
      expect(screen.getByText("7")).toBeTruthy()
    })
  })

  it("updates ordering when sortDirection prop changes", async () => {
    const { rerender } = render(
      <UserDirectorGallery
        sortBy="name"
        sortDirection="desc"
        listOfDirectorObjects={[directorA, directorZ]}
      />,
    )
    await waitFor(() => {
      const labels = screen.getAllByText(/^[AZ]$/)
      expect(labels[0].textContent).toBe("A")
    })

    rerender(
      <UserDirectorGallery
        sortBy="name"
        sortDirection="asc"
        listOfDirectorObjects={[directorA, directorZ]}
      />,
    )
    await waitFor(() => {
      const labels = screen.getAllByText(/^[AZ]$/)
      expect(labels[0].textContent).toBe("Z")
    })
  })

  it("updates content when listOfDirectorObjects changes", async () => {
    const { rerender } = render(
      <UserDirectorGallery
        {...defaultProps}
        listOfDirectorObjects={[directorA]}
      />,
    )
    await waitFor(() => expect(screen.getByText("Akira Kurosawa")).toBeTruthy())

    rerender(
      <UserDirectorGallery
        {...defaultProps}
        listOfDirectorObjects={[directorB]}
      />,
    )
    await waitFor(() => {
      expect(screen.queryByText("Akira Kurosawa")).toBeNull()
      expect(screen.getByText("Bong Joon-ho")).toBeTruthy()
    })
  })
})
