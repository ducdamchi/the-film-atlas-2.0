const express = require("express")
const router = express.Router()
const {
  Users,
  Films,
  Directors,
  WatchedDirectors,
  WatchedDirectorLikes,
  Likes,
  Saves,
} = require("../models")
const { validateToken } = require("../middlewares/AuthMiddleware")
const { Op, fn, col, Sequelize } = require("sequelize")

/* Avg_rating: total stars / total films watched. max value = 3
  watchScore: use logarithm function that rewards a director when a user watches multiple films from them. max value = 1 (when user watches 10 or more films, watchScore = 1) 
  finalScore: max(avg_rating) = 3; max(watchScore) = 1; multiply avg_rating by 2 (max 6); multiply watchScore by 4 (max 4). This will achieve a score on a scale of 10, where avg_rating has 60% weight, and num_watched_films has 40% weight.*/
function calculateScore(num_stars_total, num_watched_films) {
  const watchScore = Math.min(1, Math.log(num_watched_films + 1) / Math.log(10))
  const finalScore = Number(
    (num_stars_total / num_watched_films) * 2 + watchScore * 4
  ).toFixed(2)
  return finalScore
}

/* GET: Fetch all films added to watchlist by a user */
router.get("/", validateToken, async (req, res) => {
  try {
    const jwtUserId = req.user.id //UserId in signed JWT
    const sortBy = req.query.sortBy || "added_date"
    const sortDirection = req.query.sortDirection || "desc"
    const sortCommand = `${sortBy}_${sortDirection}`
    let order
    switch (sortCommand) {
      case "added_date_desc":
        order = [
          [{ model: Films, as: "savedFilms" }, Saves, "createdAt", "DESC"],
        ]
        break
      case "added_date_asc":
        order = [
          [{ model: Films, as: "savedFilms" }, Saves, "createdAt", "ASC"],
        ]
        break
      case "released_date_desc":
        order = [[{ model: Films, as: "savedFilms" }, "release_date", "DESC"]]
        break
      case "released_date_asc":
        order = [[{ model: Films, as: "savedFilms" }, "release_date", "ASC"]]
        break
    }
    const userWithSavedFilms = await Users.findByPk(jwtUserId, {
      include: [
        {
          model: Films,
          as: "savedFilms",
          attributes: [
            "id",
            "title",
            "runtime",
            "directors",
            "directorNamesForSorting",
            "poster_path",
            "backdrop_path",
            "origin_country",
            "release_date",
          ],
          through: {
            attributes: ["createdAt"],
          },
        },
      ],
      order: order,
    })
    if (!userWithSavedFilms) {
      return res.status(404).json({ error: "User Not Found" })
    } else {
      return res.status(200).json(userWithSavedFilms.savedFilms)
    }
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error Fetching Content" })
  }
})

/* GET: Fetch all watchlisted films from a specific country */
router.get("/by_country", validateToken, async (req, res) => {
  try {
    const jwtUserId = req.user.id
    const sortBy = req.query.sortBy || "added_date"
    const sortDirection = req.query.sortDirection || "desc"
    const sortCommand = `${sortBy}_${sortDirection}`
    const countryCode = req.query.countryCode
    let order

    if (!countryCode || countryCode.length !== 2) {
      return res.status(404).json({ error: "Country Code Not Found" })
    }

    switch (sortCommand) {
      case "added_date_desc":
        order = [
          [{ model: Films, as: "savedFilms" }, Saves, "createdAt", "DESC"],
        ]
        break
      case "added_date_asc":
        order = [
          [{ model: Films, as: "savedFilms" }, Saves, "createdAt", "ASC"],
        ]
        break
      case "released_date_desc":
        order = [[{ model: Films, as: "savedFilms" }, "release_date", "DESC"]]
        break
      case "released_date_asc":
        order = [[{ model: Films, as: "savedFilms" }, "release_date", "ASC"]]
        break
    }

    const whereCondition = Sequelize.literal(
      `JSON_CONTAINS(origin_country, '"${countryCode}"')`
    )

    const userWithSavedFilms = await Users.findByPk(jwtUserId, {
      include: [
        {
          model: Films,
          as: "savedFilms",
          attributes: [
            "id",
            "title",
            "runtime",
            "directors",
            "directorNamesForSorting",
            "poster_path",
            "backdrop_path",
            "origin_country",
            "release_date",
          ],
          where: whereCondition,
          through: {
            attributes: ["createdAt"],
          },
        },
      ],
      order: order,
    })

    if (!userWithSavedFilms) {
      return res
        .status(200)
        .json({ error: `User Not Found / Films from ${countryCode} Not Found` })
    } else {
      return res.status(200).json(userWithSavedFilms.savedFilms)
    }
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error Fetching Content" })
  }
})

/* GET: Check if a film is added to watchlist by a user */
router.get("/:tmdbId", validateToken, async (req, res) => {
  try {
    const tmdbId = req.params.tmdbId //tmdbId used in URL
    const jwtUserId = req.user.id //UserId in signed JWT

    /* Find Film instance */
    const film = await Films.findOne({ where: { id: tmdbId } })
    /* If Film not already in app's db, User couldn't have liked it */
    if (!film) {
      return res.status(200).json({ liked: false })
    }

    /* Find User instance */
    const user = await Users.findByPk(jwtUserId)
    if (!user) {
      return res.status(404).json({ error: "User Not Found" })
    }

    const saved = await user.hasSavedFilm(film)
    return res.status(200).json({ saved: saved })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error Checking Watchlist Status" })
  }
})

/* POST: Add a film to watchlist junction table */
router.post("/", validateToken, async (req, res) => {
  try {
    const jwtUserId = req.user.id //UserId in signed JWT
    const reqData = req.body
    const user = await Users.findByPk(jwtUserId)
    let deleteResult

    if (!user) {
      return res.status(404).json({ error: "User Not Found" })
    }

    /* Either find existing film or create new film */
    const [film, created] = await Films.findOrCreate({
      where: {
        id: reqData.tmdbId,
      },
      defaults: {
        tmdbId: reqData.tmdbId,
        title: reqData.title,
        runtime: reqData.runtime,
        directors: reqData.directors,
        directorNamesForSorting: reqData.directorNamesForSorting,
        poster_path: reqData.poster_path,
        backdrop_path: reqData.backdrop_path,
        origin_country: reqData.origin_country,
        release_date: reqData.release_date,
      },
    })

    /* Add film to Saves junction table */
    await user.addSavedFilm(film)
    const savedFilm = await Saves.findOne({
      where: {
        userId: jwtUserId,
        filmId: reqData.tmdbId,
      },
    })
    if (!savedFilm || !user.hasSavedFilm(film)) {
      return res.status(500).json({ error: "Error adding film to Saves" })
    }

    /* Check if film is in Likes junction table. If so, remove because a Watched film should not be in Watchlist */
    const likedFilm = await Likes.findOne({
      where: {
        userId: jwtUserId,
        filmId: reqData.tmdbId,
      },
    })
    /* Handle the removal of likedFilm similar to DELETE request sent to Watched.js */
    if (likedFilm) {
      for (const director of film.directors) {
        const watchedDirector = await WatchedDirectors.findOne({
          where: {
            directorId: director.tmdbId,
            userId: jwtUserId,
          },
        })
        if (!watchedDirector) {
          return res.status(404).json({
            error: `Cannot find entry for director ${director.name}, id: ${director.tmdbId} in WatchedDirector junction table.`,
          })
        }

        /* Add Like instance to WatchedDirectorLikes junction table */
        // deleteResult = await WatchedDirectorLikes.destroy({
        //   where: {
        //     watchedDirectorId: watchedDirector.id,
        //     likeId: likedFilm.id,
        //   },
        // })
        // if (deleteResult <= 0) {
        //   return res
        //     .status(500)
        //     .json({ error: "Error Removing Watched Director Like" })
        // }

        await watchedDirector.removeWatchedDirectorLike(likedFilm)

        const likesFromWatchedDirector = await WatchedDirectors.findByPk(
          watchedDirector.id,
          {
            include: [
              {
                model: Likes,
                as: "watchedDirectorLikes",
                attributes: [],
                through: {
                  attributes: [],
                },
              },
            ],
            attributes: [
              //use watchedDirectorLikes to refer to alias given to Likes table.
              [
                fn("COUNT", col("watchedDirectorLikes.filmId")),
                "num_watched_films",
              ],
              [fn("SUM", col("watchedDirectorLikes.stars")), "num_stars_total"],
              [fn("MAX", col("watchedDirectorLikes.stars")), "highest_star"],
            ],
            group: ["WatchedDirectors.id"], // This returns one row per WatchedDirectors record with aggregates for THAT director only
            raw: true, //return plain JS objects instead of model instances
          }
        )
        if (!likesFromWatchedDirector) {
          return res.status(500).json({
            error: "Error Fetching Aggregations for Watched Directors.",
          })
        }

        if (likesFromWatchedDirector.num_watched_films === 0) {
          deleteResult = await WatchedDirectors.destroy({
            where: {
              directorId: director.tmdbId,
              userId: jwtUserId,
            },
          })
          if (deleteResult !== 1) {
            return res
              .status(500)
              .json({ error: "Error Removing Watched Director" })
          }
        } else {
          const [affectedRows] = await WatchedDirectors.update(
            {
              num_watched_films: likesFromWatchedDirector.num_watched_films,
              num_stars_total: likesFromWatchedDirector.num_stars_total,
              avg_rating:
                likesFromWatchedDirector.num_stars_total /
                likesFromWatchedDirector.num_watched_films,
              highest_star: likesFromWatchedDirector.highest_star,
              score: calculateScore(
                likesFromWatchedDirector.num_stars_total,
                likesFromWatchedDirector.num_watched_films
              ),
            },
            {
              where: {
                directorId: director.tmdbId,
                userId: jwtUserId,
              },
            }
          )
          if (affectedRows !== 1) {
            return res.status(500).json({
              error: "Error Updating Watched Directors with new Aggregations.",
            })
          }
        }
      }

      deleteResult = await Likes.destroy({
        where: {
          userId: jwtUserId,
          filmId: film.id,
        },
      })
      if (deleteResult !== 1) {
        return res.status(500).json({ error: "Error Removing Like" })
      }
    }

    return res.status(200).json({ saved: user.hasSavedFilm(film) })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error Adding Entry" })
  }
})

/* DELETE: Removed a film 'unsaved' by User from watchlist junction table */
router.delete("/", validateToken, async (req, res) => {
  try {
    const jwtUserId = req.user.id //UserId in signed JWT
    const tmdbId = req.body.tmdbId

    /* Find Film instance */
    const film = await Films.findOne({ where: { id: tmdbId } })
    if (!film) {
      return res.status(404).json({ error: "Film Not Found" })
    }

    /* Find User instance */
    const user = await Users.findByPk(jwtUserId)
    if (!user) {
      return res.status(404).json({ error: "User Not Found" })
    }

    await user.removeSavedFilm(film)
    const saved = await user.hasSavedFilm(film)
    if (saved) {
      return res.status(500).json({ error: "Error Removing Entry" })
    }
    return res.status(200).json({ saved: saved })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error Removing Entry" })
  }
})
module.exports = router
