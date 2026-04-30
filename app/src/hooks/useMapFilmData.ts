import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getCountryName } from "@/utils/helperFunctions";
import { watchedFilmsQueryOptions } from "@/queries/collections.queries";
import type { AuthState } from "@/types/auth";
import type { FilmsPerCountryData } from "@/types/map";

interface UseMapFilmDataResult {
  filmsPerCountryData: FilmsPerCountryData;
}

/**
 * Fetches the user's watched list and aggregates film counts per country for
 * the choropleth map layer. Reuses the ['watched-list'] cache key shared with
 * the Collections page — a single cache entry serves both surfaces.
 */
export function useMapFilmData(authState: AuthState): UseMapFilmDataResult {
  const { data: mapFilmData = [] } = useQuery({
    ...watchedFilmsQueryOptions,
    enabled: !!authState.status,
  });

  const filmsPerCountryData = useMemo<FilmsPerCountryData>(() => {
    const data: Record<
      string,
      { name: string | undefined; num_watched_films: number }
    > = {};
    mapFilmData.forEach((film) => {
      film.origin_country.forEach((country) => {
        if (country in data) {
          data[country].num_watched_films++;
        } else {
          data[country] = {
            name: getCountryName(country),
            num_watched_films: 1,
          };
        }
      });
    });
    return data;
  }, [mapFilmData]);

  return { filmsPerCountryData };
}
