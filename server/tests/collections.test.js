const { get, post, put, del } = require("./helpers")

let tokenA, tokenB, userIdA, userIdB, usernameB
let collectionId

// Sample film payloads
const filmParasite = {
  tmdbId: 496243,
  title: "Parasite",
  runtime: 132,
  directors: [{ tmdbId: 21684, name: "Bong Joon-ho", profile_path: "/abc.jpg" }],
  directorNamesForSorting: "Bong Joon-ho",
  poster_path: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
  backdrop_path: "/ApiBzeaa95TNYLSKkEWbW8xULjg.jpg",
  origin_country: ["KR"],
  release_date: "2019-05-30",
  genres: [{ id: 35, name: "Comedy" }, { id: 53, name: "Thriller" }, { id: 18, name: "Drama" }],
  overview: "Greed and class discrimination threaten the newly formed symbiotic relationship...",
}

const filmOldboy = {
  tmdbId: 670,
  title: "Oldboy",
  runtime: 120,
  directors: [{ tmdbId: 10099, name: "Park Chan-wook", profile_path: "/xyz.jpg" }],
  directorNamesForSorting: "Park Chan-wook",
  poster_path: "/oldboy.jpg",
  backdrop_path: "/oldboy_bg.jpg",
  origin_country: ["KR"],
  release_date: "2003-11-21",
  genres: [{ id: 53, name: "Thriller" }, { id: 80, name: "Crime" }],
  overview: "After being inexplicably imprisoned for 15 years...",
}

beforeAll(() => {
  tokenA = global.__TOKEN_A__
  tokenB = global.__TOKEN_B__
  userIdA = global.__USER_ID_A__
  userIdB = global.__USER_ID_B__
  usernameB = global.__USERNAME_B__
})

// ─── Collection Lifecycle ────────────────────────────────────────────────────

describe("Collection lifecycle", () => {
  test("1. Create collection", async () => {
    const res = await post("/profile/me/collections", tokenA, {
      title: "Korean Cinema Essentials",
      description: "The best of Korean cinema",
      is_public: true,
    })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    expect(res.body.title).toBe("Korean Cinema Essentials")
    collectionId = res.body.id
  })

  test("2. Get owned collections", async () => {
    const res = await get("/profile/me/collections", tokenA)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.some((c) => c.id === collectionId)).toBe(true)
  })

  test("3. Get single collection", async () => {
    const res = await get(`/collections/${collectionId}`, tokenA)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(collectionId)
    expect(Array.isArray(res.body.films)).toBe(true)
    expect(res.body.films).toHaveLength(0)
  })

  test("4. Update collection", async () => {
    const res = await put(`/collections/${collectionId}`, tokenA, {
      title: "Korean Cinema Masterworks",
    })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe("Korean Cinema Masterworks")
  })

  // Test 5 (delete) runs last — see the cleanup block at the end
})

// ─── Film Management ─────────────────────────────────────────────────────────

describe("Film management", () => {
  test("6. Add film", async () => {
    const res = await post(`/collections/${collectionId}/films`, tokenA, filmParasite)
    expect(res.status).toBe(201)
    expect(res.body.film_count).toBe(1)
  })

  test("7. Add duplicate film — expect 409", async () => {
    const res = await post(`/collections/${collectionId}/films`, tokenA, filmParasite)
    expect(res.status).toBe(409)
  })

  test("8. Add second film", async () => {
    const res = await post(`/collections/${collectionId}/films`, tokenA, filmOldboy)
    expect(res.status).toBe(201)
    expect(res.body.film_count).toBe(2)
  })

  test("9. Update film note", async () => {
    const res = await put(
      `/collections/${collectionId}/films/${filmParasite.tmdbId}`,
      tokenA,
      { note: "Oscar winner for Best Picture" }
    )
    expect(res.status).toBe(200)
    expect(res.body.note).toBe("Oscar winner for Best Picture")
  })

  test("10. Remove film", async () => {
    const res = await del(
      `/collections/${collectionId}/films/${filmOldboy.tmdbId}`,
      tokenA
    )
    expect(res.status).toBe(200)
    expect(res.body.film_count).toBe(1)
  })
})

// ─── Access Control ───────────────────────────────────────────────────────────

describe("Access control", () => {
  let privateCollectionId

  test("Create private collection for access tests", async () => {
    const res = await post("/profile/me/collections", tokenA, {
      title: "Private Picks",
      is_public: false,
    })
    expect(res.status).toBe(201)
    privateCollectionId = res.body.id
  })

  test("11. Private collection — unauthenticated — expect 403", async () => {
    const res = await get(`/collections/${privateCollectionId}`, null)
    expect(res.status).toBe(403)
  })

  test("12. Private collection — non-owner — expect 403", async () => {
    const res = await get(`/collections/${privateCollectionId}`, tokenB)
    expect(res.status).toBe(403)
  })

  test("13. Update — non-owner — expect 403", async () => {
    const res = await put(`/collections/${collectionId}`, tokenB, { title: "Hacked" })
    expect(res.status).toBe(403)
  })

  test("14. Delete — non-owner — expect 403", async () => {
    const res = await del(`/collections/${collectionId}`, tokenB)
    expect(res.status).toBe(403)
  })

  test("Cleanup private test collection", async () => {
    await del(`/collections/${privateCollectionId}`, tokenA)
  })
})

// ─── Save / Unsave ────────────────────────────────────────────────────────────

describe("Save / unsave", () => {
  test("15. Save a collection as user B", async () => {
    const res = await post(`/collections/${collectionId}/save`, tokenB)
    expect(res.status).toBe(200)
    expect(res.body.saved).toBe(true)
  })

  test("16. Check save status — expect saved: true", async () => {
    const res = await get(`/collections/${collectionId}/save`, tokenB)
    expect(res.status).toBe(200)
    expect(res.body.saved).toBe(true)
  })

  test("17. Get saved collections for user B", async () => {
    const res = await get("/profile/me/collections/saved", tokenB)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.some((c) => c.id === collectionId)).toBe(true)
  })

  test("18. Unsave", async () => {
    const res = await del(`/collections/${collectionId}/save`, tokenB)
    expect(res.status).toBe(200)
    expect(res.body.saved).toBe(false)
  })

  test("16b. Check save status after unsave — expect saved: false", async () => {
    const res = await get(`/collections/${collectionId}/save`, tokenB)
    expect(res.status).toBe(200)
    expect(res.body.saved).toBe(false)
  })

  test("19. Save own collection — expect 400", async () => {
    const res = await post(`/collections/${collectionId}/save`, tokenA)
    expect(res.status).toBe(400)
  })
})

// ─── Collaborative Ownership ──────────────────────────────────────────────────

describe("Collaborative ownership", () => {
  test("20. Add co-owner by username", async () => {
    const res = await post(`/collections/${collectionId}/owners`, tokenA, {
      username: usernameB,
    })
    expect(res.status).toBe(200)
    expect(res.body.added).toBe(true)
  })

  test("21. Co-owner can update metadata", async () => {
    const res = await put(`/collections/${collectionId}`, tokenB, {
      description: "Updated by co-owner",
    })
    expect(res.status).toBe(200)
  })

  test("22. Co-owner can add film", async () => {
    const res = await post(`/collections/${collectionId}/films`, tokenB, filmOldboy)
    expect(res.status).toBe(201)
  })

  test("23. Remove co-owner", async () => {
    const res = await del(
      `/collections/${collectionId}/owners/${userIdB}`,
      tokenA
    )
    expect(res.status).toBe(200)
    expect(res.body.removed).toBe(true)
  })

  test("24. Remove last owner — expect 400", async () => {
    const res = await del(
      `/collections/${collectionId}/owners/${userIdA}`,
      tokenA
    )
    expect(res.status).toBe(400)
  })
})

// ─── Cleanup: delete the main test collection ─────────────────────────────────

describe("Cleanup", () => {
  test("5. Delete collection", async () => {
    const res = await del(`/collections/${collectionId}`, tokenA)
    expect(res.status).toBe(200)
    expect(res.body.deleted).toBe(true)
  })

  test("Confirm deletion — expect 404", async () => {
    const res = await get(`/collections/${collectionId}`, tokenA)
    expect(res.status).toBe(404)
  })
})
