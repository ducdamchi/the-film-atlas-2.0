export interface ScoringWeights {
  watchWeight: number
  ratingWeight: number
}

const DEFAULT_WEIGHTS: ScoringWeights = { watchWeight: 4, ratingWeight: 2 }

export function computeDirectorScore(
  stats: { num_watched_films: number; num_starred_films: number; num_stars_total: number },
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): number {
  const watchScore = Math.min(1, Math.log(stats.num_watched_films + 1) / Math.log(10))
  if (stats.num_starred_films === 0) return watchScore * weights.watchWeight
  return (stats.num_stars_total / stats.num_starred_films) * weights.ratingWeight
    + watchScore * weights.watchWeight
}
