import { useQuery } from "@tanstack/react-query";
import { fetchListByParams } from "@/utils/apiCalls";
import type { UserFilm } from "@/types/film";
import type { AuthState } from "@/types/auth";
import type { PopupInfo } from "@/types/map";

interface UseUserFilmsParams {
  authState: AuthState;
  isDiscoverMode: boolean;
  popupInfo: PopupInfo | null;
  queryString: string;
  sortBy: string | null;
  sortDirection: string | null;
  numStars: number | null;
}

export function useUserFilms({
  authState,
  isDiscoverMode,
  popupInfo,
  queryString,
  sortBy,
  sortDirection,
  numStars,
}: UseUserFilmsParams) {
  const enabled =
    !!authState.status &&
    !isDiscoverMode &&
    !!popupInfo?.iso_a2;

  const { data, isLoading } = useQuery<UserFilm[]>({
    queryKey: [
      "user-films",
      queryString,
      popupInfo?.iso_a2,
      sortBy,
      sortDirection,
      numStars,
    ],
    queryFn: () =>
      fetchListByParams({
        queryString,
        countryCode: popupInfo!.iso_a2,
        sortBy,
        sortDirection,
        numStars,
      }),
    enabled,
    staleTime: 0,
  });

  return { userFilmList: data ?? [], isLoading };
}
