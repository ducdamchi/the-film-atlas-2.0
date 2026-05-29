/* Libraries */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

/* Mocks — hoisted before imports by Vitest */
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }))
vi.mock("@/server/watched", () => ({
  likeFilmFn: vi.fn().mockResolvedValue({}),
  unlikeFilmFn: vi.fn().mockResolvedValue({}),
  rateFilmFn: vi.fn().mockResolvedValue({}),
}))
vi.mock("@/server/watchlisted", () => ({
  saveFilmFn: vi.fn().mockResolvedValue({}),
  unsaveFilmFn: vi.fn().mockResolvedValue({}),
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

/* Project imports */
import InteractionConsole, { TripleStarRating } from "./InteractionConsole"
import type { InteractionConsoleProps } from "./InteractionConsole"
import { AuthContext } from "@/utils/authContext"
import {
  watchedFilmsQueryOptions,
  watchlistedFilmsQueryOptions,
} from "@/queries/collections.queries"
import { likeFilmFn, unlikeFilmFn, rateFilmFn } from "@/server/watched"
import { saveFilmFn, unsaveFilmFn } from "@/server/watchlisted"
import { makeDirector, makeMovieDetails, makeUserFilm } from "./__fixtures__/film"
import type { StarRating } from "@/types/film"
import type { AuthContextValue } from "@/types/auth"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAuthContextValue(loggedIn: boolean): AuthContextValue {
  return {
    authState: {
      status: loggedIn,
      username: loggedIn ? "testuser" : "",
      id: loggedIn ? "user-1" : "",
      email: null,
      locationCountry: null,
      locationCity: null,
      locationSource: null,
    },
    setAuthState: vi.fn(),
    authLoading: false,
  }
}

/** Render TripleStarRating standalone. */
function renderRating(
  officialRating: StarRating | null | 0,
  variant: "card" | "landing-sm" | "landing-lg",
  setRequestedRating = vi.fn(),
) {
  render(
    <TripleStarRating
      officialRating={officialRating as StarRating | null}
      setRequestedRating={setRequestedRating}
      variant={variant}
    />,
  )
  return { setRequestedRating }
}

const FILM_ID = 202
const directors = [makeDirector()]
const movieDetails = makeMovieDetails() // TMDBFilm with id: 202

/**
 * Render InteractionConsole inside QueryClientProvider + AuthContext.
 * Always pre-seeds the query cache so isStatusLoading is false immediately.
 */
function renderConsole(
  propsOverrides: Partial<InteractionConsoleProps> = {},
  {
    loggedIn = false,
    watchedList = [] as ReturnType<typeof makeUserFilm>[],
    watchlistedList = [] as ReturnType<typeof makeUserFilm>[],
  } = {},
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(watchedFilmsQueryOptions.queryKey, watchedList)
  qc.setQueryData(watchlistedFilmsQueryOptions.queryKey, watchlistedList)

  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={makeAuthContextValue(loggedIn)}>
        <InteractionConsole
          tmdbId={FILM_ID}
          directors={directors}
          movieDetails={movieDetails}
          variant="card"
          {...propsOverrides}
        />
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

/**
 * Return only the star buttons from getAllByRole("button"), filtering out the
 * named buttons (aria-label), the × clear button, and the Unrate button.
 */
function getStarButtons() {
  return screen
    .getAllByRole("button")
    .filter(
      (b) =>
        !b.hasAttribute("aria-label") &&
        b.textContent !== "✕" &&
        b.textContent !== "Unrate",
    )
}

beforeEach(() => vi.clearAllMocks())

// ═══════════════════════════════════════════════════════════════════════════════
// PART 1 — TripleStarRating (absorbed from TripleStarRating.test.tsx)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Rendering — card mode (variant="card") ───────────────────────────────────

describe("TripleStarRating — rendering (card mode)", () => {
  it("renders exactly 3 star buttons when unrated", () => {
    renderRating(null, "card")
    expect(screen.getAllByRole("button")).toHaveLength(3)
  })

  it("does not render 'Rate' or 'Unrate' text", () => {
    renderRating(null, "card")
    expect(screen.queryByText("Rate")).toBeNull()
    expect(screen.queryByText("Unrate")).toBeNull()
  })

  it("does not render the × clear button when unrated", () => {
    renderRating(null, "card")
    // × button is conditionally rendered only when !showText && hasRating
    expect(screen.queryByText("✕")).toBeNull()
  })

  it("renders the × clear button in the DOM when rated (visibility is CSS-only)", () => {
    // The × button uses CSS overflow-hidden/width to hide; it IS in the DOM when rated
    renderRating(2, "card")
    expect(screen.getByText("✕")).toBeTruthy()
  })
})

// ─── Rendering — landing mode (variant="landing-sm") ─────────────────────────

describe("TripleStarRating — rendering (landing mode)", () => {
  it("shows 'Rate' span when officialRating is null", () => {
    renderRating(null, "landing-sm")
    expect(screen.getByText("Rate")).toBeTruthy()
  })

  it("shows 'Rate' span when officialRating is 0", () => {
    renderRating(0, "landing-sm")
    expect(screen.getByText("Rate")).toBeTruthy()
  })

  it("shows 'Unrate' button when officialRating is 1", () => {
    renderRating(1, "landing-sm")
    expect(screen.getByRole("button", { name: "Unrate" })).toBeTruthy()
  })

  it("shows 'Unrate' button when officialRating is 3", () => {
    renderRating(3, "landing-sm")
    expect(screen.getByRole("button", { name: "Unrate" })).toBeTruthy()
  })

  it("does not show 'Unrate' when officialRating is 0", () => {
    renderRating(0, "landing-sm")
    expect(screen.queryByRole("button", { name: "Unrate" })).toBeNull()
  })

  it("does not render the × clear button in landing mode even when rated", () => {
    // × button is gated by !showText; landing mode has showText=true so it never renders
    renderRating(2, "landing-sm")
    expect(screen.queryByText("✕")).toBeNull()
  })
})

// ─── Click callbacks — card mode ──────────────────────────────────────────────

describe("TripleStarRating — click callbacks (card mode)", () => {
  it("clicking star 1 calls setRequestedRating(1) when unrated", () => {
    const fn = vi.fn()
    renderRating(null, "card", fn)
    fireEvent.click(screen.getAllByRole("button")[0])
    expect(fn).toHaveBeenCalledWith(1)
  })

  it("clicking star 2 calls setRequestedRating(2) when unrated", () => {
    const fn = vi.fn()
    renderRating(null, "card", fn)
    fireEvent.click(screen.getAllByRole("button")[1])
    expect(fn).toHaveBeenCalledWith(2)
  })

  it("clicking star 3 calls setRequestedRating(3) when unrated", () => {
    const fn = vi.fn()
    renderRating(null, "card", fn)
    fireEvent.click(screen.getAllByRole("button")[2])
    expect(fn).toHaveBeenCalledWith(3)
  })

  it("clicking the already-active star toggles it off: calls setRequestedRating(0)", () => {
    // Toggle logic: `!showText && officialRating === n ? 0 : n`
    const fn = vi.fn()
    renderRating(2, "card", fn)
    // buttons: [star1, star2, star3, ×] — star2 is at index 1
    const starButtons = screen.getAllByRole("button").filter((b) => b.textContent !== "✕")
    fireEvent.click(starButtons[1]) // star 2 (matches officialRating)
    expect(fn).toHaveBeenCalledWith(0)
  })

  it("clicking a different star from the active one does not toggle off", () => {
    const fn = vi.fn()
    renderRating(2, "card", fn)
    const starButtons = screen.getAllByRole("button").filter((b) => b.textContent !== "✕")
    fireEvent.click(starButtons[0]) // star 1 (not the active star)
    expect(fn).toHaveBeenCalledWith(1)
  })
})

// ─── Click callbacks — landing mode ───────────────────────────────────────────

describe("TripleStarRating — click callbacks (landing mode)", () => {
  it("clicking the active star does NOT toggle off in landing mode — always passes value", () => {
    // !showText is false in landing mode, so the ternary always returns n
    const fn = vi.fn()
    renderRating(2, "landing-sm", fn)
    const starButtons = screen
      .getAllByRole("button")
      .filter((b) => b.textContent !== "Unrate")
    fireEvent.click(starButtons[1]) // star 2 (same as officialRating)
    expect(fn).toHaveBeenCalledWith(2)
  })

  it("'Unrate' button calls setRequestedRating(0)", () => {
    const fn = vi.fn()
    renderRating(2, "landing-sm", fn)
    fireEvent.click(screen.getByRole("button", { name: "Unrate" }))
    expect(fn).toHaveBeenCalledWith(0)
  })
})

// ─── × clear button ───────────────────────────────────────────────────────────

describe("TripleStarRating — × clear button", () => {
  it("is present in the DOM when card mode and rated", () => {
    renderRating(1, "card")
    expect(screen.getByText("✕")).toBeTruthy()
  })

  it("clicking × calls setRequestedRating(0)", () => {
    const fn = vi.fn()
    renderRating(1, "card", fn)
    fireEvent.click(screen.getByText("✕"))
    expect(fn).toHaveBeenCalledWith(0)
  })

  it("is absent from the DOM when unrated (card mode)", () => {
    renderRating(null, "card")
    expect(screen.queryByText("✕")).toBeNull()
  })

  it("is absent from the DOM in landing mode even when rated", () => {
    renderRating(2, "landing-sm")
    expect(screen.queryByText("✕")).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PART 2 — InteractionConsole
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Rendering — button presence ──────────────────────────────────────────────

describe("InteractionConsole — rendering (button presence)", () => {
  it("renders the 'Add to watchlist' button", () => {
    renderConsole()
    expect(screen.getByRole("button", { name: "Add to watchlist" })).toBeTruthy()
  })

  it("renders the 'Add to watched' button", () => {
    renderConsole()
    expect(screen.getByRole("button", { name: "Add to watched" })).toBeTruthy()
  })

  it("renders 3 star buttons inside TripleStarRating", () => {
    renderConsole()
    expect(getStarButtons()).toHaveLength(3)
  })
})

// ─── Rendering — liked state ──────────────────────────────────────────────────

describe("InteractionConsole — rendering (liked state)", () => {
  it("applies 'watched' pill style when film is in the watched list", () => {
    const likedFilm = makeUserFilm({ id: FILM_ID, stars: null })
    renderConsole({}, { loggedIn: true, watchedList: [likedFilm] })
    const btn = screen.getByRole("button", { name: "Add to watched" })
    // CVA applies bg-liked when state="watched"
    expect(btn.querySelector("[class*='bg-liked']")).toBeTruthy()
  })

  it("does not apply 'watched' pill style when film is not in the watched list", () => {
    renderConsole({}, { loggedIn: true, watchedList: [] })
    const btn = screen.getByRole("button", { name: "Add to watched" })
    expect(btn.querySelector("[class*='bg-liked']")).toBeNull()
  })
})

// ─── Rendering — saved state ──────────────────────────────────────────────────

describe("InteractionConsole — rendering (saved state)", () => {
  it("applies 'saved' pill style when film is in the watchlist", () => {
    const savedFilm = makeUserFilm({ id: FILM_ID })
    renderConsole({}, { loggedIn: true, watchlistedList: [savedFilm] })
    const btn = screen.getByRole("button", { name: "Add to watchlist" })
    // CVA applies bg-saved when state="saved"
    expect(btn.querySelector("[class*='bg-saved']")).toBeTruthy()
  })

  it("does not apply 'saved' pill style when film is not in the watchlist", () => {
    renderConsole({}, { loggedIn: true })
    const btn = screen.getByRole("button", { name: "Add to watchlist" })
    expect(btn.querySelector("[class*='bg-saved']")).toBeNull()
  })
})

// ─── Rendering — variant="card" (no text labels) ─────────────────────────────

describe("InteractionConsole — variant='card'", () => {
  it("does not render 'Watchlist' text", () => {
    renderConsole({ variant: "card" })
    expect(screen.queryByText("Watchlist")).toBeNull()
  })

  it("does not render 'Watched' text", () => {
    renderConsole({ variant: "card" })
    expect(screen.queryByText("Watched")).toBeNull()
  })

  it("does not render 'Rate' text", () => {
    renderConsole({ variant: "card" })
    expect(screen.queryByText("Rate")).toBeNull()
  })
})

// ─── Rendering — variant="landing-sm" (text labels visible) ──────────────────

describe("InteractionConsole — variant='landing-sm'", () => {
  it("renders 'Watchlist' label", () => {
    renderConsole({ variant: "landing-sm" })
    expect(screen.getByText("Watchlist")).toBeTruthy()
  })

  it("renders 'Watched' label", () => {
    renderConsole({ variant: "landing-sm" })
    expect(screen.getByText("Watched")).toBeTruthy()
  })

  it("renders 'Rate' text when the film is unrated", () => {
    renderConsole({ variant: "landing-sm" }, { loggedIn: true })
    expect(screen.getByText("Rate")).toBeTruthy()
  })

  it("renders 'Unrate' button when the film is already rated", () => {
    const ratedFilm = makeUserFilm({ id: FILM_ID, stars: 2 as StarRating })
    renderConsole({ variant: "landing-sm" }, { loggedIn: true, watchedList: [ratedFilm] })
    expect(screen.getByRole("button", { name: "Unrate" })).toBeTruthy()
  })
})

// ─── Interactions — unauthenticated ───────────────────────────────────────────

describe("InteractionConsole — unauthenticated interactions", () => {
  beforeEach(() => {
    vi.spyOn(window, "alert").mockImplementation(() => {})
  })

  it("clicking 'Add to watched' shows a login alert", () => {
    renderConsole()
    fireEvent.click(screen.getByRole("button", { name: "Add to watched" }))
    expect(window.alert).toHaveBeenCalledWith("Log in to interact with films!")
  })

  it("clicking 'Add to watchlist' shows a login alert", () => {
    renderConsole()
    fireEvent.click(screen.getByRole("button", { name: "Add to watchlist" }))
    expect(window.alert).toHaveBeenCalledWith("Log in to interact with films!")
  })

  it("does not call likeFilmFn when clicking watched while unauthenticated", () => {
    renderConsole()
    fireEvent.click(screen.getByRole("button", { name: "Add to watched" }))
    expect(likeFilmFn).not.toHaveBeenCalled()
  })

  it("does not call saveFilmFn when clicking watchlist while unauthenticated", () => {
    renderConsole()
    fireEvent.click(screen.getByRole("button", { name: "Add to watchlist" }))
    expect(saveFilmFn).not.toHaveBeenCalled()
  })
})

// ─── Interactions — authenticated like / unlike ───────────────────────────────

describe("InteractionConsole — authenticated like/unlike", () => {
  it("clicking 'Add to watched' calls likeFilmFn when the film is not liked", async () => {
    renderConsole({}, { loggedIn: true, watchedList: [] })
    fireEvent.click(screen.getByRole("button", { name: "Add to watched" }))
    await waitFor(() => expect(likeFilmFn).toHaveBeenCalledOnce())
  })

  it("clicking 'Add to watched' calls unlikeFilmFn when the film is already liked", async () => {
    const likedFilm = makeUserFilm({ id: FILM_ID, stars: null })
    renderConsole({}, { loggedIn: true, watchedList: [likedFilm] })
    fireEvent.click(screen.getByRole("button", { name: "Add to watched" }))
    await waitFor(() => expect(unlikeFilmFn).toHaveBeenCalledOnce())
  })

  it("does not call unlikeFilmFn when film is not liked", async () => {
    renderConsole({}, { loggedIn: true, watchedList: [] })
    fireEvent.click(screen.getByRole("button", { name: "Add to watched" }))
    await waitFor(() => expect(likeFilmFn).toHaveBeenCalled())
    expect(unlikeFilmFn).not.toHaveBeenCalled()
  })
})

// ─── Interactions — authenticated save / unsave ───────────────────────────────

describe("InteractionConsole — authenticated save/unsave", () => {
  it("clicking 'Add to watchlist' calls saveFilmFn when the film is not saved", async () => {
    renderConsole({}, { loggedIn: true })
    fireEvent.click(screen.getByRole("button", { name: "Add to watchlist" }))
    await waitFor(() => expect(saveFilmFn).toHaveBeenCalledOnce())
  })

  it("clicking 'Add to watchlist' calls unsaveFilmFn when the film is already saved", async () => {
    const savedFilm = makeUserFilm({ id: FILM_ID })
    renderConsole({}, { loggedIn: true, watchlistedList: [savedFilm] })
    fireEvent.click(screen.getByRole("button", { name: "Add to watchlist" }))
    await waitFor(() => expect(unsaveFilmFn).toHaveBeenCalledOnce())
  })
})

// ─── Interactions — rating flow ───────────────────────────────────────────────

describe("InteractionConsole — rating flow", () => {
  it("rating a non-liked film triggers likeFilmFn (not rateFilmFn)", async () => {
    // Guard: `if (!isLiked) { watchMutation.mutate(true) }` — like + rating in one call
    renderConsole({}, { loggedIn: true, watchedList: [] })
    fireEvent.click(getStarButtons()[0]) // star 1
    await waitFor(() => expect(likeFilmFn).toHaveBeenCalledOnce())
    expect(rateFilmFn).not.toHaveBeenCalled()
  })

  it("rating an already-liked film triggers rateFilmFn (not likeFilmFn)", async () => {
    // Guard else branch: `rateMutation.mutate(req)`
    const likedFilm = makeUserFilm({ id: FILM_ID, stars: null })
    renderConsole({}, { loggedIn: true, watchedList: [likedFilm] })
    fireEvent.click(getStarButtons()[0]) // star 1 (different from officialRating=null)
    await waitFor(() => expect(rateFilmFn).toHaveBeenCalledOnce())
    expect(likeFilmFn).not.toHaveBeenCalled()
  })

  it("clicking the same star as the current rating fires no mutation (landing mode)", async () => {
    // Guard: `if (requestedRating === officialRating) return`
    // In landing mode clicking star 2 when officialRating=2 → setRequestedRating(2) → guard fires
    const ratedFilm = makeUserFilm({ id: FILM_ID, stars: 2 as StarRating })
    renderConsole({ variant: "landing-sm" }, { loggedIn: true, watchedList: [ratedFilm] })
    fireEvent.click(getStarButtons()[1]) // star 2 — same as officialRating
    // Wait a tick to let any potential effect resolve, then assert no mutation fired
    await new Promise((r) => setTimeout(r, 50))
    expect(rateFilmFn).not.toHaveBeenCalled()
    expect(likeFilmFn).not.toHaveBeenCalled()
  })

  it("toggling off an active star in card mode calls rateFilmFn with stars=0", async () => {
    // In card mode, clicking the active star → setRequestedRating(0) → rateMutation with stars=0
    const ratedFilm = makeUserFilm({ id: FILM_ID, stars: 2 as StarRating })
    renderConsole({}, { loggedIn: true, watchedList: [ratedFilm] })
    // When rated, the × button is in DOM; exclude it from star selection
    const starButtons = screen
      .getAllByRole("button")
      .filter((b) => !b.hasAttribute("aria-label") && b.textContent !== "✕")
    fireEvent.click(starButtons[1]) // star 2 (the active star) → toggles off to 0
    await waitFor(() => expect(rateFilmFn).toHaveBeenCalledOnce())
    const callArg = (rateFilmFn as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArg.data.stars).toBe(0)
  })
})
