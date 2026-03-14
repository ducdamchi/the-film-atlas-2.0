/**
 * src/types/index.ts
 *
 * Barrel export — re-exports every public type from each domain module so
 * consumers can import from a single path:
 *
 *   import type { AuthState, TMDBFilm, UserFilm } from '@/types'
 *
 * Add new domain files here as the migration progresses.
 */

export type {
  AuthState,
  AuthContextValue,
} from './auth'

export type {
  TMDBVideo,
  TMDBImage,
  TMDBCastMember,
  TMDBCrewMember,
  TMDBCredits,
  TMDBFilm,
  TMDBFilmSummary,
  TMDBPerson,
  TMDBSearchResult,
  TMDBDiscoverResponse,
} from './tmdb'

export type {
  DirectorRef,
  UserFilm,
  DirectorStats,
  Director,
  DirectorStatus,
  StarRating,
  RatingState,
  FilmInteractionRequest,
  FilmRateRequest,
} from './film'

export type {
  ApiError,
  AuthVerifyResponse,
  AuthLoginResponse,
  AuthLoginErrorResponse,
  LikeStatusResponse,
  LikeFilmResponse,
  RateFilmResponse,
  SaveStatusResponse,
  OmdbRating,
  OmdbResponse,
  WikidataAward,
  WikidataAwardsResponse,
  CountryDefaults,
} from './api'

export type {
  MapMode,
  MyFilmsFilter,
  MapQueryString,
  PopupInfo,
  CountryProperties,
  DiscoverFilmParams,
  DiscoverPageState,
  FilmsPerCountryData,
} from './map'
