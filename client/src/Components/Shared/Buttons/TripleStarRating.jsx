import React, { useState } from "react"

/**
 * Renders inside an InteractionConsole variant wrapper — inherits all --console-* CSS custom properties.
 */
export default function TripleStarRating({ officialRating, setRequestedRating }) {
  const [starHover, setStarHover] = useState(0) //1, 2, 3 for number of stars, 0 for not hover

  return (
    <div
      className="hover:bg-[var(--console-hover-bg)] transition-all duration-200 ease-out h-full group flex items-center justify-center"
      style={{ padding: "var(--console-button-padding)" }}>
      <div
        className="console-button justify-center"
        style={{
          borderColor:
            officialRating >= 1 ? "oklch(65.6% 0.241 354.308)" : "var(--console-text)",
          height: "var(--console-button-height)",
          padding: "var(--console-padding-tb) var(--console-padding-lr)",
        }}>
        <div
          className="flex items-center justify-center hover:text-[var(--console-hover-text)] transition-all duration-200 ease-out"
          style={{ fontSize: "var(--console-star-size)" }}>
          <button
            onMouseEnter={() => setStarHover(1)}
            onMouseLeave={() => setStarHover(0)}
            onClick={() => setRequestedRating(1)}>
            {starHover >= 1 || officialRating >= 1 ? (
              <span className="text-pink-600">&#10048;</span>
            ) : (
              <span>&#10048;</span>
            )}
          </button>
          <button
            onMouseEnter={() => setStarHover(2)}
            onMouseLeave={() => setStarHover(0)}
            onClick={() => setRequestedRating(2)}>
            {starHover >= 2 || officialRating >= 2 ? (
              <span className="text-pink-600">&#10048;</span>
            ) : (
              <span>&#10048;</span>
            )}
          </button>
          <button
            onMouseEnter={() => setStarHover(3)}
            onMouseLeave={() => setStarHover(0)}
            onClick={() => setRequestedRating(3)}>
            {starHover === 3 || officialRating >= 3 ? (
              <span className="text-pink-600">&#10048;</span>
            ) : (
              <span>&#10048;</span>
            )}
          </button>
        </div>
        <div className="h-full flex items-center justify-center">
          {officialRating !== 0 &&
            officialRating !== undefined &&
            officialRating !== null && (
              <button
                onClick={() => setRequestedRating(0)}
                className="hover:text-[var(--console-hover-text)] transition-all duration-200 ease-out text-pink-600"
                style={{ fontSize: "var(--console-font-size)" }}>
                Unrate
              </button>
            )}
          {(officialRating === 0 ||
            officialRating === undefined ||
            officialRating === null) && (
            <span
              className="group-hover:text-[var(--console-hover-text)]"
              style={{ fontSize: "var(--console-font-size)" }}>
              Rate
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
