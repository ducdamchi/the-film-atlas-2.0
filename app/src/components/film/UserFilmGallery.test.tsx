import { render, screen, waitFor } from "@testing-library/react"
import UserFilmGallery from "./UserFilmGallery"
import { makeUserFilm } from "./__fixtures__/film"
import type { UserFilm } from "@/types/film"

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("./UserFilmCard", () => ({
  default: ({ filmObject }: { filmObject: UserFilm }) => (
    <div data-testid={`user-card-${filmObject.id}`} />
  ),
}))

vi.mock("./FilmCardSkeleton", () => ({
  default: () => <div data-testid="film-card-skeleton" />,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

// Use dates far in the past — getNiceMonthYear returns stable "Month Year" strings
// getNiceMonthYear("2020-01") → "January 2020"
// getNiceMonthYear("2019-12") → "December 2019"

// Mid-year release dates avoid the timezone rollback issue with new Date("yyyy-01-01") UTC midnight
const jan2020a = makeUserFilm({ id: 1, added_date: "2020-01-15T10:00:00.000Z", release_date: "2020-07-15" })
const jan2020b = makeUserFilm({ id: 2, added_date: "2020-01-28T10:00:00.000Z", release_date: "2020-07-01" })
const dec2019  = makeUserFilm({ id: 3, added_date: "2019-12-10T10:00:00.000Z", release_date: "2019-07-15" })

const defaultProps = {
  queryString: "watched" as const,
  sortBy: "added_date" as const,
  sortDirection: "desc" as const,
}

// ─── Loading state ────────────────────────────────────────────────────────────

describe("UserFilmGallery — loading state", () => {
  it("renders exactly 8 skeleton cards when isLoading=true", () => {
    render(
      <UserFilmGallery {...defaultProps} listOfFilmObjects={[]} isLoading={true} />,
    )
    expect(screen.getAllByTestId("film-card-skeleton")).toHaveLength(8)
  })

  it("does NOT render any UserFilmCard when isLoading=true", () => {
    render(
      <UserFilmGallery {...defaultProps} listOfFilmObjects={[jan2020a]} isLoading={true} />,
    )
    expect(screen.queryByTestId("user-card-1")).toBeNull()
  })
})

// ─── Empty state ──────────────────────────────────────────────────────────────

describe("UserFilmGallery — empty state", () => {
  it("renders 'No films found based on current settings.' when list is empty", () => {
    render(<UserFilmGallery {...defaultProps} listOfFilmObjects={[]} />)
    expect(screen.getByText("No films found based on current settings.")).toBeTruthy()
  })
})

// ─── Grouping — added_date ────────────────────────────────────────────────────

describe("UserFilmGallery — grouping by added_date", () => {
  it("two films with the same added_date month appear under one group header", async () => {
    render(
      <UserFilmGallery
        {...defaultProps}
        sortBy="added_date"
        listOfFilmObjects={[jan2020a, jan2020b]}
      />,
    )
    await waitFor(() => {
      expect(screen.getAllByText("January 2020")).toHaveLength(1)
    })
  })

  it("films from different months produce separate group headers", async () => {
    render(
      <UserFilmGallery
        {...defaultProps}
        sortBy="added_date"
        listOfFilmObjects={[jan2020a, dec2019]}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText("January 2020")).toBeTruthy()
      expect(screen.getByText("December 2019")).toBeTruthy()
    })
  })

  it("group headers show human-readable month name", async () => {
    render(
      <UserFilmGallery
        {...defaultProps}
        sortBy="added_date"
        listOfFilmObjects={[jan2020a]}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText("January 2020")).toBeTruthy()
    })
  })

  it("films with no added_date are silently skipped", async () => {
    const noDate = makeUserFilm({ id: 99, added_date: undefined as any })
    render(
      <UserFilmGallery
        {...defaultProps}
        sortBy="added_date"
        listOfFilmObjects={[jan2020a, noDate]}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText("January 2020")).toBeTruthy()
      expect(screen.queryByTestId("user-card-99")).toBeNull()
    })
  })
})

// ─── Grouping — released_date ─────────────────────────────────────────────────

describe("UserFilmGallery — grouping by released_date", () => {
  it("two films from the same release year appear under one group header", async () => {
    // jan2020a and jan2020b both have release years in 2020
    render(
      <UserFilmGallery
        {...defaultProps}
        sortBy="released_date"
        listOfFilmObjects={[jan2020a, jan2020b]}
      />,
    )
    await waitFor(() => {
      expect(screen.getAllByText("2020")).toHaveLength(1)
    })
  })

  it("different release years produce separate group headers showing the year", async () => {
    render(
      <UserFilmGallery
        {...defaultProps}
        sortBy="released_date"
        listOfFilmObjects={[jan2020a, dec2019]}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText("2020")).toBeTruthy()
      expect(screen.getByText("2019")).toBeTruthy()
    })
  })
})

// ─── Sort direction — added_date ──────────────────────────────────────────────

describe("UserFilmGallery — sort direction (added_date)", () => {
  it("desc: most recent group appears first", async () => {
    render(
      <UserFilmGallery
        {...defaultProps}
        sortBy="added_date"
        sortDirection="desc"
        listOfFilmObjects={[dec2019, jan2020a]}
      />,
    )
    await waitFor(() => {
      const headers = screen.getAllByText(/January 2020|December 2019/)
      expect(headers[0].textContent).toBe("January 2020")
      expect(headers[1].textContent).toBe("December 2019")
    })
  })

  it("asc: older group appears first", async () => {
    render(
      <UserFilmGallery
        {...defaultProps}
        sortBy="added_date"
        sortDirection="asc"
        listOfFilmObjects={[jan2020a, dec2019]}
      />,
    )
    await waitFor(() => {
      const headers = screen.getAllByText(/January 2020|December 2019/)
      expect(headers[0].textContent).toBe("December 2019")
      expect(headers[1].textContent).toBe("January 2020")
    })
  })
})

// ─── Sort direction — released_date ──────────────────────────────────────────

describe("UserFilmGallery — sort direction (released_date)", () => {
  it("desc: higher year appears first", async () => {
    render(
      <UserFilmGallery
        {...defaultProps}
        sortBy="released_date"
        sortDirection="desc"
        listOfFilmObjects={[dec2019, jan2020a]}
      />,
    )
    await waitFor(() => {
      const headers = screen.getAllByText(/^(2019|2020)$/)
      expect(headers[0].textContent).toBe("2020")
      expect(headers[1].textContent).toBe("2019")
    })
  })

  it("asc: lower year appears first", async () => {
    render(
      <UserFilmGallery
        {...defaultProps}
        sortBy="released_date"
        sortDirection="asc"
        listOfFilmObjects={[jan2020a, dec2019]}
      />,
    )
    await waitFor(() => {
      const headers = screen.getAllByText(/^(2019|2020)$/)
      expect(headers[0].textContent).toBe("2019")
      expect(headers[1].textContent).toBe("2020")
    })
  })
})

// ─── queryString variations ───────────────────────────────────────────────────

describe("UserFilmGallery — queryString variations", () => {
  it("queryString='watched': grouping works correctly", async () => {
    render(
      <UserFilmGallery
        {...defaultProps}
        queryString="watched"
        sortBy="added_date"
        listOfFilmObjects={[jan2020a]}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText("January 2020")).toBeTruthy()
      expect(screen.getByTestId("user-card-1")).toBeTruthy()
    })
  })

  it("queryString='watchlisted': grouping works correctly", async () => {
    render(
      <UserFilmGallery
        {...defaultProps}
        queryString="watchlisted"
        sortBy="added_date"
        listOfFilmObjects={[jan2020a]}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText("January 2020")).toBeTruthy()
      expect(screen.getByTestId("user-card-1")).toBeTruthy()
    })
  })

  it("queryString='watched/rated': grouping works correctly", async () => {
    render(
      <UserFilmGallery
        {...defaultProps}
        queryString="watched/rated"
        sortBy="added_date"
        listOfFilmObjects={[jan2020a]}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText("January 2020")).toBeTruthy()
      expect(screen.getByTestId("user-card-1")).toBeTruthy()
    })
  })
})

// ─── Film count per group ─────────────────────────────────────────────────────

describe("UserFilmGallery — film count per group", () => {
  it("both films in the same month group are rendered inside that group", async () => {
    render(
      <UserFilmGallery
        {...defaultProps}
        sortBy="added_date"
        listOfFilmObjects={[jan2020a, jan2020b]}
      />,
    )
    await waitFor(() => {
      expect(screen.getByTestId("user-card-1")).toBeTruthy()
      expect(screen.getByTestId("user-card-2")).toBeTruthy()
    })
  })
})
