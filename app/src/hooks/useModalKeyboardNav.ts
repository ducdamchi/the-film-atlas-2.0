import { useEffect, useState } from "react";
import type { RefObject, Dispatch, SetStateAction } from "react";

interface UseModalKeyboardNavOptions {
  isOpen: boolean;
  resultsRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  resultCount: number;
  onEscape: () => void;
}

interface UseModalKeyboardNavReturn {
  focusedIndex: number;
  setFocusedIndex: Dispatch<SetStateAction<number>>;
  displayedResults: NodeListOf<Element>;
}

export function useModalKeyboardNav({
  isOpen,
  resultsRef,
  inputRef,
  resultCount,
  onEscape,
}: UseModalKeyboardNavOptions): UseModalKeyboardNavReturn {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [displayedResults, setDisplayedResults] = useState<NodeListOf<Element>>(
    document.querySelectorAll(".no-results-placeholder"),
  );

  // Focus input when modal opens; reset index
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setFocusedIndex(-1);
    }
  }, [isOpen, inputRef]);

  // Re-query .search-result nodes whenever results change
  useEffect(() => {
    if (resultsRef.current) {
      setDisplayedResults(
        resultsRef.current.querySelectorAll(".search-result"),
      );
    }
  }, [resultCount, resultsRef]);

  // Move focus to the right element when index changes
  useEffect(() => {
    if (!resultsRef.current || !inputRef.current) return;
    if (focusedIndex === -1) {
      inputRef.current.focus();
    } else {
      const el = displayedResults[focusedIndex];
      if (el instanceof HTMLElement) el.focus();
    }
  }, [focusedIndex, displayedResults, resultsRef, inputRef]);

  // Arrow key + Escape listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setFocusedIndex((prev) =>
          prev === displayedResults.length - 1 ? -1 : prev + 1,
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setFocusedIndex((prev) =>
          prev === -1 ? displayedResults.length - 1 : prev - 1,
        );
      } else if (event.key === "Escape") {
        onEscape();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [displayedResults, onEscape]);

  return { focusedIndex, setFocusedIndex, displayedResults };
}
