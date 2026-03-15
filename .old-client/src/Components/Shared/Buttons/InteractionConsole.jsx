/* Libraries */
import React, { useEffect, useState, useContext, useRef } from "react"
import { useLocation, useParams, useNavigate, Link } from "react-router-dom"
import axios from "axios"

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
  BiStar,
  BiSolidStar,
} from "react-icons/bi"
import { AiFillClockCircle } from "react-icons/ai"

export default function InteractionConsole({
  tmdbId,
  directors,
  movieDetails,
  setIsLoading,
  isLoading,
  css,
  showOverview,
}) {
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [officialRating, setOfficialRating] = useState(null) //0 for liked but unrated; 1, 2, 3 for corresponding stars; null when film unliked
  const [requestedRating, setRequestedRating] = useState(-1) //-1 when neutral (no requests), 0 for unrated; 1, 2, 3 for stars.
  // const [isLoading, setIsLoading] = useState(false)

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
    /* If user is logged in, they can like/unlike. */
    if (authState.status) {
      // setIsLoading(true)
      try {
        if (!isLiked) {
          const req = createReqBody("like")
          req["stars"] = requestedRating !== -1 ? requestedRating : 0
          console.log("Request:", req)
          const result = await likeFilm(req)
          if (result.error) {
            console.error("Server: ", result.error)
          } else {
            setIsLiked(result.liked)
            setOfficialRating(result.stars)
            setRequestedRating(-1)
            setIsSaved(false) //optimistically "unsave" film on client side. upon reload this value will get updated with actual Save status.
          }
        } else {
          const result = await unlikeFilm(movieDetails.id)

          if (result.error) {
            console.error("Server: ", response.data.error)
          } else {
            setIsLiked(result.liked)
            setOfficialRating(result.stars)
          }
        }
      } catch (err) {
        alert("Error liking/unliking film, please try again.")
        console.error("Error in handleLike(): ", err)
      } finally {
        // setIsLoading(false)
      }
      /* If user not logged in, alert */
    } else {
      alert("Log in to interact with films!")
      return
    }
  }
  async function handleSave() {
    /* If user is logged in, they can save/unsave */
    if (authState.status) {
      // setIsLoading(true)
      try {
        if (!isSaved) {
          const req = createReqBody("save")

          console.log(movieDetails)
          console.log("Save request: ", req)
          const result = await saveFilm(req)
          if (result.error) {
            console.error("Server: ", result.error)
          } else {
            setIsSaved(result.saved)
            //optimistically "unlike" film on client side. upon reload this value will get updated with actual Like status (incl ratings).
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
      } finally {
        // setIsLoading(false)
      }

      /* If user not logged in, alert */
    } else {
      alert("Log in to interact with films!")
      return
    }
  }
  async function handleRate() {
    /* If user is logged in, they can like/unlike. */
    if (authState.status) {
      try {
        /* Only take action if requested rating differs from official rating */
        if (requestedRating !== officialRating) {
          /* Rate film if requested rating is in valid range */
          if (requestedRating >= 0 && requestedRating <= 3) {
            /* IMPORTANT: If a film has not been liked when it is rated, send a like request with the requested Rating */
            if (!isLiked) {
              const req = createReqBody("like")
              req["stars"] = requestedRating !== -1 ? requestedRating : 0
              console.log("Request:", req)
              const result = await likeFilm(req)
              if (result.error) {
                console.error("Server: ", result.error)
              } else {
                setIsLiked(result.liked)
                setOfficialRating(result.stars)
                setRequestedRating(-1)
                setIsSaved(false) //optimistically "unsave" film on client side. upon reload this value will get updated with actual Save status.
              }
            } else {
              const req = createReqBody("rate")
              req["stars"] = requestedRating
              const result = await rateFilm(req)
              if (result.error) {
                console.error("Server: ", result.error)
              } else {
                setOfficialRating(result.stars)
                setRequestedRating(-1) //neutral state
              }
            }
          } else if (requestedRating == -1) {
            // console.log("Requested rating: back to neutral (-1)")
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
      /* If user not logged in, alert */
    } else {
      if (requestedRating !== -1 && requestedRating !== null) {
        console.log(requestedRating)
        alert("Log in to interact with films!")
        return
      }
    }
  }

  useEffect(() => {
    // console.log("hook triggered")
    handleRate()
  }, [requestedRating])

  /* Fetch film info for Landing Page */
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
            if (saveResult.saved) {
              setIsSaved(true)
            } else {
              setIsSaved(false)
            }
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
          className={`flex flex-col z-30 items-center justify-center gap-0`}
          style={{ color: css.textColor }}>
          {showOverview && (
            <div
              className="text-white w-[85%] pr-4 pl-4 pb-2 mb-5"
              onClick={() => {
                navigate(`/films/${movieDetails.id}`)
              }}>
              <span className="text-[9.5px]/1">
                {movieDetails.overview?.slice(0, 180)}
              </span>
              {movieDetails.overview?.length >= 181 && <span>{`...`}</span>}
            </div>
          )}

          <div
            className={`flex justify-center items-end w-full`}
            style={{
              gap: css.flexGap,
              height: css.height,
            }}>
            <button
              alt="Add to watched"
              title="Add to watched"
              className={`hover:text-[var(--hover-text-color)] transition-all duration-200 ease-out hover:bg-[var(--hover-bg-color)] h-full flex items-center  p-0`}
              style={{
                "--hover-text-color": css.hoverTextColor,
                "--hover-bg-color": css.hoverBg,
                padding: css.buttonPadding,
              }}
              onClick={handleLike}>
              {isLiked ? (
                <div
                  className="console-button"
                  style={{
                    backgroundColor: css.likedBgColor,
                    borderColor: css.likedBgColor,
                    padding: `${css.paddingTopBottom} ${css.paddingLeftRight}`,
                    height: css.buttonHeight,
                  }}>
                  <BiSolidHeart
                    style={{ color: css.likeColor, fontSize: css.likeSize }}
                    // className={`text-${css.likeColor} text-${css.likeSize}`}
                  />
                  <span
                    style={{
                      color: css.likeColor,
                      fontSize: css.fontSize,
                      "--hover-text-color": css.hoverTextColor,
                    }}
                    // className={`text-${css.likeColor} text-${css.fontSize}`}
                  >
                    Watched
                  </span>
                </div>
              ) : (
                <div
                  className="console-button"
                  style={{
                    padding: `${css.paddingTopBottom} ${css.paddingLeftRight}`,
                    height: css.buttonHeight,
                  }}>
                  <BiHeart
                    // className={`text-${css.likeSize}`}
                    style={{ fontSize: css.likeSize }}
                  />
                  <span
                    // className={`text-${css.fontSize}`}
                    style={{ fontSize: css.fontSize }}>
                    Watched
                  </span>
                </div>
              )}
            </button>
            <button
              alt="Add to watchlist"
              title="Add to watchlist"
              className={`hover:text-[var(--hover-text-color)] transition-all duration-200 ease-out hover:bg-[var(--hover-bg-color)] h-full flex items-center`}
              style={{
                "--hover-text-color": css.hoverTextColor,
                "--hover-bg-color": css.hoverBg,
                padding: css.buttonPadding,
              }}
              onClick={handleSave}>
              {isSaved ? (
                <div
                  className="console-button"
                  style={{
                    backgroundColor: css.savedBgColor,
                    borderColor: css.savedBgColor,
                    padding: `${css.paddingTopBottom} ${css.paddingLeftRight}`,
                    height: css.buttonHeight,
                  }}>
                  <BiListCheck
                    // className={`text-${css.saveColor} text-${css.saveSize}`}
                    style={{ color: css.saveColor, fontSize: css.saveSize }}
                  />
                  <span
                    // className={`text-${css.saveColor} text-${css.fontSize}`}
                    style={{ color: css.saveColor, fontSize: css.fontSize }}>
                    Watchlist
                  </span>
                </div>
              ) : (
                <div
                  className="console-button"
                  style={{
                    padding: `${css.paddingTopBottom} ${css.paddingLeftRight}`,
                    height: css.buttonHeight,
                  }}>
                  <BiListPlus
                    className={`text-${css.saveSize}`}
                    style={{ fontSize: css.saveSize }}
                  />
                  <span
                    // className={`text-${css.fontSize}`}
                    style={{ fontSize: css.fontSize }}>
                    Watchlist
                  </span>
                </div>
              )}
            </button>
            <TripleStarRating
              officialRating={officialRating}
              setRequestedRating={setRequestedRating}
              css={css}
            />
          </div>
        </div>
      )}
    </>
  )
}

{
  /* 
          <div className="text-white w-[85%] flex items-center justify-center gap-2 pr-4 pl-4 pb-4">
            <AiFillClockCircle />
            <span className="">{`${movieDetails.runtime} minutes`}</span>
          </div> */
}
