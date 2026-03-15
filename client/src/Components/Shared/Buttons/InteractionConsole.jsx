/* Libraries */
import React, { useEffect, useState, useContext } from "react"
import { useNavigate } from "@tanstack/react-router"

/* Custom functions */
import {
  checkLikeStatus,
  checkSaveStatus,
  likeFilm,
  unlikeFilm,
  saveFilm,
  unsaveFilm,
  rateFilm,
} from "../../../Utils/apiCalls"
import { AuthContext } from "../../../Utils/authContext"

import TripleStarRating from "./TripleStarRating"

/* Icons */
import {
  BiListPlus,
  BiListCheck,
  BiHeart,
  BiSolidHeart,
} from "react-icons/bi"

/**
 * @param {"card"|"overlay-sm"|"overlay-lg"|"landing-sm"|"landing-lg"} variant
 * Styling is driven by CSS custom properties set on .console-{variant} in styles.css
 */
export default function InteractionConsole({
  tmdbId,
  directors,
  movieDetails,
  setIsLoading,
  isLoading,
  variant,
  showOverview,
}) {
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [officialRating, setOfficialRating] = useState(null) //0 for liked but unrated; 1, 2, 3 for corresponding stars; null when film unliked
  const [requestedRating, setRequestedRating] = useState(-1) //-1 when neutral (no requests), 0 for unrated; 1, 2, 3 for stars.

  const { authState, loading } = useContext(AuthContext)
  const navigate = useNavigate()

  /* Create the request body for API call to App's DB when user 'like' a film */
  function createReqBody(requestString) {
    const directorsList = directors.map((director) => ({
      tmdbId: director.id,
      name: director.name,
      profile_path: director.profile_path,
    }))
    const directorNamesForSorting = directors
      .map((director) => director.name)
      .join(", ")

    let req
    switch (requestString) {
      case "like":
      case "save":
        req = {
          tmdbId: movieDetails.id,
          title: movieDetails.title,
          runtime: movieDetails.runtime,
          poster_path: movieDetails.poster_path,
          backdrop_path: movieDetails.backdrop_path,
          origin_country: movieDetails.origin_country,
          release_date: movieDetails.release_date,
          directors: directorsList,
          directorNamesForSorting: directorNamesForSorting,
        }
        break
      case "rate":
        req = {
          tmdbId: movieDetails.id,
          directors: directorsList,
          stars: requestedRating,
        }
    }

    return req
  }

  async function handleLike() {
    if (authState.status) {
      try {
        if (!isLiked) {
          const req = createReqBody("like")
          req["stars"] = requestedRating !== -1 ? requestedRating : 0
          const result = await likeFilm(req)
          if (result.error) {
            console.error("Server: ", result.error)
          } else {
            setIsLiked(result.liked)
            setOfficialRating(result.stars)
            setRequestedRating(-1)
            setIsSaved(false)
          }
        } else {
          const result = await unlikeFilm(movieDetails.id)
          if (result.error) {
            console.error("Server: ", result.error)
          } else {
            setIsLiked(result.liked)
            setOfficialRating(result.stars)
          }
        }
      } catch (err) {
        alert("Error liking/unliking film, please try again.")
        console.error("Error in handleLike(): ", err)
      }
    } else {
      alert("Log in to interact with films!")
      return
    }
  }

  async function handleSave() {
    if (authState.status) {
      try {
        if (!isSaved) {
          const req = createReqBody("save")
          const result = await saveFilm(req)
          if (result.error) {
            console.error("Server: ", result.error)
          } else {
            setIsSaved(result.saved)
            setIsLiked(false)
            setOfficialRating(null)
          }
        } else {
          const result = await unsaveFilm(movieDetails.id)
          if (result.error) {
            console.log("Server: ", result.error)
          } else {
            setIsSaved(result.saved)
          }
        }
      } catch (err) {
        alert("Error saving/unsaving film, please try again.")
        console.error("Error in handleSave(): ", err)
      }
    } else {
      alert("Log in to interact with films!")
      return
    }
  }

  async function handleRate() {
    if (authState.status) {
      try {
        if (requestedRating !== officialRating) {
          if (requestedRating >= 0 && requestedRating <= 3) {
            if (!isLiked) {
              const req = createReqBody("like")
              req["stars"] = requestedRating !== -1 ? requestedRating : 0
              const result = await likeFilm(req)
              if (result.error) {
                console.error("Server: ", result.error)
              } else {
                setIsLiked(result.liked)
                setOfficialRating(result.stars)
                setRequestedRating(-1)
                setIsSaved(false)
              }
            } else {
              const req = createReqBody("rate")
              req["stars"] = requestedRating
              const result = await rateFilm(req)
              if (result.error) {
                console.error("Server: ", result.error)
              } else {
                setOfficialRating(result.stars)
                setRequestedRating(-1)
              }
            }
          } else if (requestedRating == -1) {
            // neutral state, no action
          } else {
            console.error("Requested rating out of range.")
          }
        }
      } catch (err) {
        alert("Error rating/unrating film, please try again.")
        console.error("Error in handleRate(): ", err)
      } finally {
        setIsLoading(false)
      }
    } else {
      if (requestedRating !== -1 && requestedRating !== null) {
        alert("Log in to interact with films!")
        return
      }
    }
  }

  useEffect(() => {
    handleRate()
  }, [requestedRating])

  useEffect(() => {
    const fetchPageData = async () => {
      if (authState.status && tmdbId) {
        setIsLoading(true)
        try {
          const likeResult = await checkLikeStatus(tmdbId)
          const saveResult = await checkSaveStatus(tmdbId)

          if (likeResult.error) {
            console.error("Server: ", likeResult.error)
          } else {
            setIsLiked(likeResult.liked)
            setOfficialRating(likeResult.stars)
          }

          if (saveResult.error) {
            console.error("Server: ", saveResult.error)
          } else {
            setIsSaved(saveResult.saved)
          }
        } catch (err) {
          console.error("Error loading film data: ", err)
        } finally {
          setIsLoading(false)
        }
      }
    }
    fetchPageData()
  }, [tmdbId])

  return (
    <>
      {!isLoading && (
        <div
          className={`console-${variant} flex flex-col z-30 items-center justify-center gap-0`}
          style={{ color: "var(--console-text)" }}>
          {showOverview && (
            <div
              className="text-white w-[85%] pr-4 pl-4 pb-2 mb-5"
              onClick={() => {
                navigate({ to: `/films/${movieDetails.id}` })
              }}>
              <span className="text-[9.5px]/1">
                {movieDetails.overview?.slice(0, 180)}
              </span>
              {movieDetails.overview?.length >= 181 && <span>{`...`}</span>}
            </div>
          )}

          <div
            className="flex justify-center items-end w-full"
            style={{
              gap: "var(--console-gap)",
              height: "var(--console-height)",
            }}>
            {/* Watched button */}
            <button
              alt="Add to watched"
              title="Add to watched"
              className="hover:text-[var(--console-hover-text)] transition-all duration-200 ease-out hover:bg-[var(--console-hover-bg)] h-full flex items-center p-0"
              style={{ padding: "var(--console-button-padding)" }}
              onClick={handleLike}>
              {isLiked ? (
                <div
                  className="console-button"
                  style={{
                    backgroundColor: "var(--color-liked)",
                    borderColor: "var(--color-liked)",
                    padding:
                      "var(--console-padding-tb) var(--console-padding-lr)",
                    height: "var(--console-button-height)",
                  }}>
                  <BiSolidHeart
                    style={{
                      color: "white",
                      fontSize: "var(--console-like-size)",
                    }}
                  />
                  <span
                    style={{
                      color: "white",
                      fontSize: "var(--console-font-size)",
                    }}>
                    Watched
                  </span>
                </div>
              ) : (
                <div
                  className="console-button"
                  style={{
                    padding:
                      "var(--console-padding-tb) var(--console-padding-lr)",
                    height: "var(--console-button-height)",
                  }}>
                  <BiHeart style={{ fontSize: "var(--console-like-size)" }} />
                  <span style={{ fontSize: "var(--console-font-size)" }}>
                    Watched
                  </span>
                </div>
              )}
            </button>

            {/* Watchlist button */}
            <button
              alt="Add to watchlist"
              title="Add to watchlist"
              className="hover:text-[var(--console-hover-text)] transition-all duration-200 ease-out hover:bg-[var(--console-hover-bg)] h-full flex items-center"
              style={{ padding: "var(--console-button-padding)" }}
              onClick={handleSave}>
              {isSaved ? (
                <div
                  className="console-button"
                  style={{
                    backgroundColor: "var(--color-saved)",
                    borderColor: "var(--color-saved)",
                    padding:
                      "var(--console-padding-tb) var(--console-padding-lr)",
                    height: "var(--console-button-height)",
                  }}>
                  <BiListCheck
                    style={{
                      color: "white",
                      fontSize: "var(--console-save-size)",
                    }}
                  />
                  <span
                    style={{
                      color: "white",
                      fontSize: "var(--console-font-size)",
                    }}>
                    Watchlist
                  </span>
                </div>
              ) : (
                <div
                  className="console-button"
                  style={{
                    padding:
                      "var(--console-padding-tb) var(--console-padding-lr)",
                    height: "var(--console-button-height)",
                  }}>
                  <BiListPlus
                    style={{ fontSize: "var(--console-save-size)" }}
                  />
                  <span style={{ fontSize: "var(--console-font-size)" }}>
                    Watchlist
                  </span>
                </div>
              )}
            </button>

            <TripleStarRating
              officialRating={officialRating}
              setRequestedRating={setRequestedRating}
            />
          </div>
        </div>
      )}
    </>
  )
}
