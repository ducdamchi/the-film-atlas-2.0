import { useEffect, useRef, useState } from "react";
import { fetchFilmFromTMDB } from "@/utils/apiCalls";
import type { TMDBFilm, TMDBCrewMember } from "@/types/tmdb";

export function useFilmCardFetch(filmId: number) {
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [movieDetails, setMovieDetails] = useState<TMDBFilm | Record<string, never>>({});
  const [directors, setDirectors] = useState<TMDBCrewMember[]>([]);
  const [isPosterHovered, setIsPosterHovered] = useState(false);

  const hasFetchedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = async () => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    try {
      setIsLoading(true);
      const result = await fetchFilmFromTMDB(filmId);
      const directorsList = result.credits.crew.filter(
        (crewMember: TMDBCrewMember) => crewMember.job === "Director",
      );
      setMovieDetails(result);
      setDirectors(directorsList);
    } catch (err) {
      console.error("Error loading film data: ", err);
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on mount if already mobile
  useEffect(() => {
    if (window.innerWidth < 768) fetchData();
  }, []);

  // Fetch when resizing into mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) fetchData();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleCardHoverEnter = () => {
    if (hasFetchedRef.current || window.innerWidth < 768) return;
    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      if (hasFetchedRef.current) return;
      hasFetchedRef.current = true;
      try {
        const result = await fetchFilmFromTMDB(filmId);
        const directorsList = result.credits.crew.filter(
          (crewMember: TMDBCrewMember) => crewMember.job === "Director",
        );
        setMovieDetails(result);
        setDirectors(directorsList);
      } catch (err) {
        console.error("Error loading film data: ", err);
        setFetchError(true);
      } finally {
        setIsLoading(false);
      }
    }, 1000);
  };

  const handleCardHoverLeave = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      if (!hasFetchedRef.current) setIsLoading(false);
    }
  };

  return {
    isLoading,
    setIsLoading,
    fetchError,
    movieDetails,
    directors,
    isPosterHovered,
    setIsPosterHovered,
    handleCardHoverEnter,
    handleCardHoverLeave,
  };
}
