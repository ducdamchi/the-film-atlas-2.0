// Shared helpers for updating collection aggregate fields.
// Both functions accept a pg PoolClient so they run within the caller's transaction.

// delta = +1 (add) or -1 (remove)
// film must have: runtime, genres (array of {id}), origin_country (array of strings), release_date
async function updateAggregates(client, collectionId, film, delta) {
  const { rows } = await client.query(
    `SELECT genres_aggregate, countries_aggregate, decades_aggregate
     FROM "Collections" WHERE id = $1`,
    [collectionId]
  )
  if (!rows[0]) return

  const col = rows[0]
  const genresAgg = col.genres_aggregate || {}
  const countriesAgg = col.countries_aggregate || {}
  const decadesAgg = col.decades_aggregate || {}

  for (const g of film.genres || []) {
    const key = String(g.id)
    genresAgg[key] = Math.max(0, (genresAgg[key] || 0) + delta)
    if (genresAgg[key] === 0) delete genresAgg[key]
  }

  for (const c of film.origin_country || []) {
    countriesAgg[c] = Math.max(0, (countriesAgg[c] || 0) + delta)
    if (countriesAgg[c] === 0) delete countriesAgg[c]
  }

  if (film.release_date && film.release_date.length >= 4) {
    const decade = `${film.release_date.substring(0, 3)}0s`
    decadesAgg[decade] = Math.max(0, (decadesAgg[decade] || 0) + delta)
    if (decadesAgg[decade] === 0) delete decadesAgg[decade]
  }

  await client.query(
    `UPDATE "Collections" SET
       genres_aggregate = $1,
       countries_aggregate = $2,
       decades_aggregate = $3,
       total_runtime = GREATEST(0, total_runtime + $4),
       film_count = GREATEST(0, film_count + $5),
       "updatedAt" = now()
     WHERE id = $6`,
    [
      JSON.stringify(genresAgg),
      JSON.stringify(countriesAgg),
      JSON.stringify(decadesAgg),
      (film.runtime || 0) * delta,
      delta,
      collectionId,
    ]
  )
}

// Returns the collection id for a user's system collection ('watched' | 'watchlist').
// Accepts a transaction client so it runs within the same transaction as the caller.
async function getSystemCollectionId(client, userId, type) {
  const { rows } = await client.query(
    `SELECT c.id FROM "Collections" c
     JOIN "CollectionOwners" co ON co."collectionId" = c.id
     WHERE co."userId" = $1 AND c.collection_type = $2 LIMIT 1`,
    [userId, type]
  )
  return rows[0]?.id || null
}

module.exports = { updateAggregates, getSystemCollectionId }
