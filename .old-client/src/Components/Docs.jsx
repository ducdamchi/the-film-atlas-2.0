import React, { useContext, useState, useEffect } from "react"
import { Link } from "react-router-dom"
import NavBar from "./Shared/Navigation-Search/NavBar"
import QuickSearchModal from "./Shared/Navigation-Search/QuickSearchModal"
import { GoSquareFill } from "react-icons/go"
import { AuthContext } from "../Utils/authContext"
import { useNavigate } from "react-router-dom"
import useCommandKey from "../Hooks/useCommandKey"

import { MathJax, MathJaxContext } from "better-react-mathjax"
import { MdMenuBook } from "react-icons/md"

export default function Docs() {
  const navigate = useNavigate()
  const { searchModalOpen, setSearchModalOpen } = useContext(AuthContext)
  const [menuOpened, setMenuOpened] = useState(false)
  const [screenWidth, setScreenWidth] = useState(window.innerWidth)

  /* Dynamically obtain screen width of window */
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  useEffect(() => {
    if (screenWidth >= 1024) {
      setMenuOpened(true)
    } else setMenuOpened(false)
  }, [screenWidth])

  function toggleSearchModal() {
    setSearchModalOpen((status) => !status)
  }
  useCommandKey(toggleSearchModal, "k")
  return (
    <MathJaxContext>
      <div className="font-primary mt-20 mb-20 min-h-screen h-auto relative">
        {searchModalOpen && (
          <QuickSearchModal
            searchModalOpen={searchModalOpen}
            setSearchModalOpen={setSearchModalOpen}
          />
        )}
        <div className="flex flex-col items-center relative w-screen h-auto">
          <NavBar />

          <div className="relative">
            <button
              onClick={() => {
                if (screenWidth < 1024) {
                  setMenuOpened((prevState) => !prevState)
                }
              }}
              className="ml-5 mt-5 fixed left-0 bg-white p-3 rounded-full drop-shadow-md z-60 border-1 border-stone-900/30 transition-all ease-in-out duration-300 flex items-center justify-start">
              <div className="flex items-center justify-start gap-2">
                <MdMenuBook className="text-3xl" />

                {menuOpened && (
                  <div className="font-bold text-sm uppercase">
                    Table of Contents
                  </div>
                )}
              </div>
            </button>

            {menuOpened && (
              <div className="fixed left-0 top-[4rem] h-auto border-1 border-stone-900/30 w-[18rem] bg-white p-7 z-50 drop-shadow-md md:text-lg lg:h-screen">
                <div className="mt-24 flex flex-col justify-center items-start gap-5">
                  {/* Getting started */}
                  <div className="flex flex-col gap-2">
                    <Link
                      to="/docs#getting-started"
                      className="docs-menu-heading">
                      Getting Started
                    </Link>
                    <ul className="docs-menu-content">
                      <Link
                        to="/docs#getting-started-glance"
                        className="hover:text-blue-800">
                        At A Glance
                      </Link>
                      <Link
                        to="/docs#getting-started-account"
                        className="hover:text-blue-800">
                        Creating An Account
                      </Link>
                    </ul>
                    {/* Getting started */}
                  </div>
                  {/* Feature Highlights */}
                  <div className="flex flex-col gap-2">
                    <Link to="/docs#feature" className="docs-menu-heading">
                      Feature Highlights
                    </Link>
                    <ul className="docs-menu-content">
                      <Link
                        to="/docs#feature-map"
                        className="hover:text-blue-800">
                        Map Page
                      </Link>
                      <Link
                        to="/docs#feature-film"
                        className="hover:text-blue-800">
                        Films Page
                      </Link>
                      <Link
                        to="/docs#feature-director"
                        className="hover:text-blue-800">
                        Directors Page
                      </Link>
                      <Link
                        to="/docs#feature-search"
                        className="hover:text-blue-800">
                        Quick Search
                      </Link>
                    </ul>
                  </div>
                  {/* Curation System */}
                  <div className="flex flex-col gap-2">
                    <Link to="/docs#curation" className="docs-menu-heading">
                      Curation System
                    </Link>
                    <ul className="docs-menu-content">
                      <Link
                        to="/docs#curation-origin"
                        className="hover:text-blue-800">
                        Origin Country
                      </Link>
                      <Link
                        to="/docs#curation-stars"
                        className="hover:text-blue-800">
                        Stars (Films)
                      </Link>
                      <Link
                        to="/docs#curation-score"
                        className="hover:text-blue-800">
                        Score (Directors)
                      </Link>
                    </ul>
                  </div>
                  {/* Crit review */}
                  <div className="flex flex-col gap-2">
                    <Link to="/docs#crit-review" className="docs-menu-heading">
                      Critical Review
                    </Link>
                    <ul className="docs-menu-content">
                      <Link
                        to="/docs#crit-review-bias"
                        className="hover:text-blue-800">
                        Voting Bias
                      </Link>
                    </ul>
                  </div>
                  {/* Acknowledgement */}
                  <div className="flex flex-col gap-2">
                    <Link
                      to="/docs#acknowledgement"
                      className="docs-menu-heading">
                      Acknowledgement
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="w-screen lg:w-[calc(100vw-18rem)] xl:w-[calc(100vw-36rem)] lg:ml-[18rem]">
            <div className="font-heading page-title mb-10">DOCUMENTATION</div>

            <div className="flex items-center justify-center ">
              <div className=" md:p-10 max-w-[40rem] md:text-lg md:max-w-[45rem]">
                {/* Getting started - At a glance*/}
                <section className="flex flex-col p-5 gap-10 mb-20">
                  <div className="uppercase flex flex-col gap-2">
                    <div id="getting-started" className="docs-sectionCategory">
                      Getting started
                    </div>
                    <div
                      id="getting-started-glance"
                      className="docs-sectionTitle">
                      AT A GLANCE
                    </div>
                  </div>
                  <div className="flex flex-col gap-20">
                    <div className="flex flex-col gap-2">
                      <Link
                        className="docs-subtitle hover:text-blue-800 cursor-pointer transition-all ease-out duration-200"
                        to="/map"
                        target="_blank"
                        rel="noopener noreferrer">
                        Map
                      </Link>
                      <div className="font-light">
                        Once users start adding films to their watched list,
                        their map will be colored based on the corresponding
                        origin countries of the watched films.
                      </div>
                      <img
                        src="/mapexample1.png"
                        alt="Image of a heat map of the world based on a user's watched films."
                        className="docs-img"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link
                        className="docs-subtitle hover:text-blue-800 cursor-pointer transition-all ease-out duration-200"
                        to="/films"
                        target="_blank"
                        rel="noopener noreferrer">
                        Films
                      </Link>
                      <div className="font-light">
                        Automatically, collections of films (watched, watchlist,
                        rated) will also appear on the{" "}
                        <Link
                          className="text-blue-800"
                          to="/films"
                          target="_blank"
                          rel="noopener noreferrer">
                          films
                        </Link>{" "}
                        main page, which can be sorted and displayed in several
                        ways.
                      </div>
                      <img
                        src="/filmsexample1.png"
                        alt="Image of a heat map of the world based on a user's watched films."
                        className="docs-img"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link
                        className="docs-subtitle hover:text-blue-800 cursor-pointer transition-all ease-out duration-200"
                        to="/directors"
                        target="_blank"
                        rel="noopener noreferrer">
                        Directors
                      </Link>
                      <div className="font-light">
                        A list of directors whose films users have watched will
                        also be formed.
                      </div>
                      <img
                        src="/directorsexample1.png"
                        alt="Image of a heat map of the world based on a user's watched films."
                        className="docs-img"
                      />
                    </div>
                  </div>
                </section>

                {/* Getting started - Create account */}
                <section className="flex flex-col p-5 gap-10 mb-20">
                  <div className="uppercase flex flex-col gap-2">
                    <div className="docs-sectionCategory">Getting started</div>
                    <div
                      id="getting-started-account"
                      className="docs-sectionTitle">
                      Creating an account
                    </div>
                  </div>
                  <div className="flex flex-col gap-10">
                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">Enjoy All Features</div>
                      <div className="font-light">
                        An account is needed for The Film Atlas to keep track of
                        your interactions with films. These interactions are
                        crucial for creating a heat map of the world, compiling
                        a list of your watched directors, and maintaining a
                        personal collection of watched, rated, or watchlisted
                        films. Note that we do not ask for email addresses in
                        order to simplify the log in process and maintain the
                        anynomity of users.
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">Account-less Features</div>
                      <div className="font-light">
                        While it is highly recommended to create an account,
                        users can still enjoy some features of The Film Atlas
                        without one. These features include browsing films in
                        Discovery mode on the Map Page, looking up details from
                        a film or director, and viewing the filmography of a
                        director or actor.
                      </div>
                    </div>
                  </div>
                  {/* <div className="border-1 h-[1px] w-[80%] self-center mt-5"></div> */}
                </section>

                {/* Feature highlights - MAP page*/}
                <section className="flex flex-col p-5 gap-10 mb-20 font-light">
                  <div className="uppercase flex flex-col gap-2">
                    <div id="feature" className="docs-sectionCategory">
                      Feature Highlights
                    </div>
                    <div id="feature-map" className="docs-sectionTitle">
                      MAP PAGE
                    </div>
                  </div>
                  <div className="flex flex-col gap-20">
                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">Select A Region</div>
                      <div className="">
                        Clicking on a country will trigger a small popup window
                        displaying how many films you've seen from that country.
                        More importantly, this action will also set the target
                        country for other features, such as discovering films or
                        viewing films you've watched from that country. If an
                        invalid region is clicked on (e.g. Atlantic Ocean), no
                        films data will be available for that region. By
                        default, the map page will display "Select Region" for
                        first time visitors, as no region has been selected on
                        the map.
                      </div>
                      <img
                        src="/map1.png"
                        alt="Image of a popup container displaying how many films user has watched from selected country."
                        className="docs-img"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">Discover Mode</div>
                      <div className="font-light">
                        In Discover Mode, you will be able to view a list of
                        films from your currently selected country. This list is
                        provided via an API call to{" "}
                        <a
                          href="https://www.themoviedb.org/?language=en-US"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-800 cursor-pointer">
                          The Movies Database
                        </a>{" "}
                        (TMDB), and currently we include three sort options:
                      </div>
                      <ul className="docs-list">
                        <li className="">
                          <span>
                            <GoSquareFill className="text-lg inline mb-1" />
                            &nbsp;<span className="font-bold">
                              RANDOM:
                            </span>{" "}
                            films will be shuffled in an arbitrary order.
                          </span>
                        </li>
                        <li className="">
                          <GoSquareFill className="text-lg inline" />
                          &nbsp;
                          <span className="font-bold">AVG. RATING:</span> films
                          with the highest average rating (according to TMDB
                          records) will appear first.
                        </li>
                        <li className="">
                          <GoSquareFill className="text-lg inline" />
                          &nbsp;<span className="font-bold">
                            VOTE COUNT:
                          </span>{" "}
                          films with the highest vote count (according to TMDB
                          records) will appear first.
                        </li>
                      </ul>
                      <img
                        src="/map4.png"
                        alt="Discover Mode with three sort options: Random, Average Rating, and Vote Count."
                        className="docs-img"
                      />
                    </div>

                    <div className="flex flex-col gap-2 font-light">
                      <div className="docs-subtitle">Filter Console</div>
                      <div className="">
                        By default, the Filter sliders are set to filter out
                        films that are rated below 7 and has less than 100
                        votes. We highly recommend users to adjust these values
                        for different countries, as{" "}
                        <Link
                          to="/docs#crit-review-bias"
                          className="text-blue-800 cursor-pointer inline">
                          voting biases
                        </Link>{" "}
                        may be present within the database that we use.
                      </div>
                      <img
                        src="/map2.png"
                        alt="Showing films from Iran that has average rating
                  greater than or equal to 5.8, vote count greater than or equal
                  to 80, with highest-rated films being displayed first."
                        className="docs-img"
                      />
                      <div className="italic">
                        Example: Showing films from Iran that has average rating
                        greater than or equal to 5.8, vote count greater than or
                        equal to 80, with highest-rated films being displayed
                        first.{" "}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">Watched/Rated Films</div>
                      <div className="">
                        On the Map page, users are also able to view films
                        they've watched or rated that belongs to a selected
                        country on the map. For more details refer to the Films
                        console.
                      </div>
                    </div>
                  </div>
                </section>

                {/* Feature highlights - FILMS page*/}
                <section className="flex flex-col p-5 gap-10 mb-20 font-light">
                  <div className="uppercase flex flex-col gap-2">
                    <div className="docs-sectionCategory">
                      Feature Highlights
                    </div>
                    <div id="feature-film" className="docs-sectionTitle">
                      FILMS PAGE
                    </div>
                  </div>
                  <div className="flex flex-col gap-20">
                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">Films Console</div>
                      <div className="">
                        With the Films console, you can view films that you've
                        watched, rated, or added to a watchlist. Films in the
                        Watched or Watchlist collection can be sorted by how
                        recently they were added, or by their release year. An
                        additional 'rating' filter can be applied to films in
                        the Rated collection. Refer to{" "}
                        <Link
                          to="/docs#curation-stars"
                          className="text-blue-800 cursor-pointer inline">
                          this section
                        </Link>{" "}
                        for more details on the rating system.
                      </div>
                      <img
                        src="/films3.png"
                        alt="Image of films console."
                        className="docs-img"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">Search Bar (Films)</div>
                      <div className="">
                        This search bar allows you to search for a film by its
                        title. When you are actively typing, the page will enter
                        Search mode, which automatically hides the films console
                        (see above). In order to exit Search mode and view the
                        console again, simply clear the search bar. Note that
                        you can only search for films with this search bar. Use
                        the{" "}
                        <Link
                          to="/docs#feature-director"
                          className="text-blue-800 cursor-pointer inline">
                          director's page search bar
                        </Link>{" "}
                        if you want to search for directors instead.
                      </div>
                      <img
                        src="/films1.png"
                        alt="Image of Films Page when search bar is being actively used."
                        className="docs-img"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">Landing Page (Films)</div>
                      <div className="">
                        Clicking on a film card will take you to the film
                        landing page. Here, you will be able to read the film's
                        full overview, view the main cast and crew, and watch
                        the trailer if it's available. Our criteria for 'main'
                        cast and crew is simple: if the person has a profile
                        picture on TMDB, they will be featured.
                      </div>
                      <img
                        src="/filmlanding1.png"
                        alt="Image of Films Page when search bar is being actively used."
                        className="docs-img"
                      />
                      <div className="">
                        You can also click on the name of the director or a
                        member of the cast, which will take you to a separate
                        landing page for cast and crew.
                      </div>
                    </div>
                  </div>
                </section>

                {/* Feature highlights - DIRECTORS page*/}
                <section className="flex flex-col p-5 gap-10 mb-20 font-light">
                  <div className="uppercase flex flex-col gap-2">
                    <div className="docs-sectionCategory">
                      Feature Highlights
                    </div>
                    <div id="feature-director" className="docs-sectionTitle">
                      DIRECTORS PAGE
                    </div>
                  </div>
                  <div className="flex flex-col gap-20">
                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">Directors Console</div>
                      <div className="">
                        The Directors console differs from the Films console in
                        that you will always be looking at a comprehensive list
                        of the directors you've watched without any filter
                        options. However, the sorting options give you a
                        convenient way to index these directors and rearrange
                        them in several ways:
                      </div>
                      <img
                        src="/directors1.png"
                        alt="Image of directors console."
                        className="docs-img"
                      />
                      <ul className="docs-list">
                        <li className="">
                          <span>
                            <GoSquareFill className="text-lg inline mb-1" />
                            &nbsp;<span className="font-bold">NAME:</span>{" "}
                            Directors can be arranged in alphabetical or reverse
                            alphabetical order. Note that our system uses the
                            first word in a director's full name for sorting, as
                            TMDB does not have separate fields for first and
                            last names.
                          </span>
                        </li>
                        <li className="">
                          <GoSquareFill className="text-lg inline" />
                          &nbsp;<span className="font-bold">SCORE:</span>{" "}
                          Directors can be arranged in descending or ascending
                          order of their assigned score (1-10) based on the
                          user's interactions. Refer to{" "}
                          <Link
                            to="/docs#curation-score"
                            className="text-blue-800 cursor-pointer inline">
                            this section
                          </Link>{" "}
                          for more details on our directors scoring system.
                        </li>
                        <li className="">
                          <GoSquareFill className="text-lg inline" />
                          &nbsp;
                          <span className="font-bold">STARS:</span> Directors
                          can be arranged in descending or ascending order of
                          the highest star they've received from the user for a
                          film (0-3). Refer to{" "}
                          <Link
                            to="/docs#curation-stars"
                            className="text-blue-800 cursor-pointer inline">
                            this section
                          </Link>{" "}
                          for more details on our films starring system.
                        </li>
                      </ul>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">
                        Search Bar (Directors)
                      </div>
                      <div className="">
                        This search bar allows you to search for a director by
                        their name. Most times, you will need to spell the
                        director's full name correctly for the desired result to
                        show up. This happens because we are directly querrying
                        for results from TMDB, and are dependent on their search
                        algorithm.
                      </div>
                      <div className="">
                        Not all directors will have a profile picture. Those
                        without one will appear with a placeholder picture.
                      </div>
                      <img
                        src="/directors2.png"
                        alt="Directors search result for Kelly Rei."
                        className="docs-img"
                      />
                      <div>
                        Similar to the search bar for films, you can start
                        typing to enter Search mode, and simply clear the search
                        bar to exit it. Note that you can only search for
                        directors with this search bar. Use the{" "}
                        <Link
                          to="/docs#feature-film"
                          className="text-blue-800 cursor-pointer inline">
                          film page's search bar
                        </Link>{" "}
                        if you want to search for films instead.
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">
                        Landing Page (Directors)
                      </div>
                      <div className="">
                        Clicking on a director card will take you to the
                        director landing page. Here, you will be able to read
                        the director's biography, view their assigned score, and
                        browse through their entire filmography, sorted from
                        most recent to last recent.
                      </div>
                      <img
                        src="/directorlanding.png"
                        alt="Image of Films Page when search bar is being actively used."
                        className="docs-img"
                      />
                    </div>
                  </div>
                </section>

                {/* Feature highlights - QUICK SEARCH*/}
                <section className="flex flex-col p-5 gap-10 mb-20 font-light">
                  <div className="uppercase flex flex-col gap-2">
                    <div className="docs-sectionCategory">
                      Feature Highlights
                    </div>
                    <div id="feature-search" className="docs-sectionTitle">
                      QUICK SEARCH ({`\u2318K`})
                    </div>
                  </div>
                  <div className="flex flex-col gap-20">
                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">Search Anytime</div>
                      <div className="">
                        The ({`\u2318K`}) shortcut (Ctrl+K for non-Mac) allows
                        users to search for a film by its title no matter what
                        page they are on within The Film Atlas. No account is
                        required for this feature.
                      </div>
                      <img
                        src="/quicksearch.png"
                        alt="Quick Search modal."
                        className="docs-img"
                      />
                      <ul className="docs-list">
                        <li className="">
                          <span>
                            <GoSquareFill className="text-lg inline mb-1" />
                            &nbsp;<span className="font-bold">
                              RESULTS:
                            </span>{" "}
                            The Quick Search modal displays the first 7 results
                            from your search input. For a list of full results,
                            simply hit enter right after you finish typing. This
                            will take you to the Films page and automatically
                            turn on Search mode.
                          </span>
                        </li>
                        <li className="">
                          <GoSquareFill className="text-lg inline" />
                          &nbsp;<span className="font-bold">NAVIGATON:</span> If
                          you're on a laptop, use Up and Down arrow keys to
                          browse through the list of results. Hitting enter on a
                          result will take you to the landing page for that
                          film.
                        </li>
                        <li className="">
                          <GoSquareFill className="text-lg inline" />
                          &nbsp;
                          <span className="font-bold">EXIT:</span> To exit Quick
                          Search, simply hit {`\u2318K`} again (or the Esc
                          button, or the Escape key), or click anywhere outside
                          of the Quick Search modal.
                        </li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Curation system - Origin*/}
                <section className="flex flex-col p-5 gap-10 mb-20 font-light">
                  <div className="uppercase flex flex-col gap-2">
                    <div id="curation" className="docs-sectionCategory">
                      Curation system
                    </div>
                    <div id="curation-origin" className="docs-sectionTitle">
                      Origin Country
                    </div>
                  </div>
                  <div className="flex flex-col gap-20">
                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">Definition</div>
                      <div className="">
                        The <span className="italic">origin_country</span> field
                        of each film is extracted from The Movies Database. The
                        API does not provide a formal definition for this field.
                        However, it generally refers to the primary country
                        where a film is first released. Sometimes, there is a
                        strong link between the origin country and the original
                        language of the film. The origin country is to be
                        distinguished from production countries.
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">Why we use this field</div>
                      <div className="">
                        It is the closest indication of a film's 'nationality'
                        available on TMDB, and often coincides with the
                        nationality that the director identifies with (which is
                        also not available on TMDB). The{" "}
                        <span className="italic">production_countries</span>{" "}
                        field often include too many countries that are not of
                        equal significance. That being said, there are instances
                        of <span className="italic">origin_country</span> that
                        could be misleading that we thought the user should be
                        aware of. This is something that we are currently
                        working on improving.
                      </div>
                    </div>
                  </div>
                </section>

                {/* Curation system - Stars*/}
                <section className="flex flex-col p-5 gap-10 mb-20 font-light">
                  <div className="uppercase flex flex-col gap-2">
                    <div id="curation" className="docs-sectionCategory">
                      Curation system
                    </div>
                    <div id="curation-stars" className="docs-sectionTitle">
                      STARS (FILMS)
                    </div>
                  </div>
                  <div className="flex flex-col gap-20">
                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">Rating A Film</div>
                      <div className="">
                        You can rate a film by giving it either 1, 2, or 3
                        stars. A useful guide would be to think of it in terms
                        of Michelin stars. In order for a restaurant to get just
                        one star, it must have been delivering distinctly rich
                        flavors and creating a wonderful culinary experience for
                        its customers. In this line of thought, one can watch a
                        lot of films throughout their lifetime but reserve the
                        stars only for films they consider most impactful. The
                        criteria for each star is entirely left to the user's
                        imagination, but below is an example:
                      </div>
                      <ul className="docs-list italic">
                        <li className="">
                          <span>
                            <span
                              className={`text-pink-600 text-3xl inline mr-1`}>
                              &#10048;
                            </span>
                            &nbsp;"Unique, tastefully done, an exemplar of its
                            genre."
                          </span>
                        </li>
                        <li className="">
                          <span>
                            <span
                              className={`text-pink-600 text-3xl inline mr-1`}>
                              &#10048;&#10048;
                            </span>
                            &nbsp;"Extremely well conceived, presented themes
                            worthy of deep introspection, instilled in viewer
                            strong convictions and left a lingering impression."
                          </span>
                        </li>
                        <li className="">
                          <span>
                            <span
                              className={`text-pink-600 text-3xl inline mr-1`}>
                              &#10048;&#10048;&#10048;
                            </span>
                            &nbsp;"A phenomenal cinematic experience that shaped
                            worldviews, masterfully created in every aspect of
                            production, creative and boundary-defining, to be
                            thought of and referenced by viewer as a work that
                            has informed, if not defined their taste in films."
                          </span>
                        </li>
                      </ul>
                      <img
                        src="/rating1.png"
                        alt="Image of the rating console."
                        className="docs-img"
                      />
                      <div className="">This system will allow us to:</div>
                      <ul className="docs-list">
                        <li className="">
                          <GoSquareFill className="text-lg inline" />
                          &nbsp;{" "}
                          <span className="font-bold">
                            HANDLE NEUTRALITY:
                          </span>{" "}
                          It is common in our psychology that neutral actions
                          accompany neutral feelings (which in most cases
                          translates to 'doing nothing'), whereas strong
                          feelings call for a change in the status quo. This
                          rating system tries to mimic the same behavior. Most
                          of us wouldn't go out of our way to rate a film 3/10.
                          But if we experienced a memorable film, why not
                          encapsulate those emotions with a star encoded with
                          personal meanings?
                        </li>
                        <li className="">
                          <span>
                            <GoSquareFill className="text-lg inline mb-1" />
                            &nbsp;
                            <span className="font-bold">
                              REDUCE GRANULARITY:
                            </span>{" "}
                            Rating systems on a scale of 10 or 5 can be too
                            granular for curatorial purposes. For example, it
                            will be quite challenging to consistently
                            distinguish between a 5/10 (2.5/5) and 6/10 (3/5)
                            film--and there are little usage to this
                            categorization even if one manages to do it well.
                          </span>
                        </li>
                      </ul>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">Watched Vs. Rated</div>
                      <div className="">
                        The Rated collection is a subset of the Watched
                        collection. In other words, users can mark a film as
                        watched without rating it, but any film that is rated
                        will automatically be marked as watched. Unrating a
                        rated film will not affect its watched status. Also note
                        that films cannot be in the Rated/Watched and Watchlist
                        collections at the same time.
                      </div>
                      <img
                        src="/consoledemo.gif"
                        alt="Directors search result for Kelly Rei."
                        className="docs-img"
                      />
                    </div>
                  </div>
                </section>

                {/* Curation system - Scores*/}
                <section className="flex flex-col p-5 gap-10 mb-20 font-light">
                  <div className="uppercase flex flex-col gap-2">
                    <div className="docs-sectionCategory">Curation system</div>
                    <div id="curation-score" className="docs-sectionTitle">
                      SCORE (DIRECTORS)
                    </div>
                  </div>
                  <div className="flex flex-col gap-20">
                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">
                        Calculating Score For Directors
                      </div>
                      <div className="flex flex-col">
                        <div>
                          The following equation is used to calculate a
                          director's score:
                        </div>
                        <div className="flex flex-col items-start gap-6 m-5 w-[15rem]  self-center">
                          <MathJax>
                            {
                              "\\(S = \\underbrace{f(a)}_{\\leq 6} + \\underbrace{f(b)}_{\\leq 4}\\)"
                            }
                          </MathJax>
                          <MathJax>
                            {"\\(f(a) = \\underbrace{a}_{\\leq 3} \\times 2\\)"}
                          </MathJax>
                          <MathJax>
                            {
                              "\\(f(b) = \\underbrace{\\min(1, \\frac{\\log{(b+1)}}{\\log{10}})}_{\\leq 1} \\times 4\\)"
                            }
                          </MathJax>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        where:
                        <div className="flex flex-col items-start gap-4 m-5 w-[15rem] self-center">
                          <MathJax>{"\\(S=\\)"} final score</MathJax>
                          <MathJax>{"\\(f(a)=\\)"} rating score</MathJax>
                          <MathJax>{"\\(f(b)=\\)"} watch score</MathJax>
                          <MathJax>
                            {"\\(a=\\)"} average stars (total stars / number of
                            starred films)
                          </MathJax>
                          <MathJax>
                            {"\\(b=\\)"} number of watched films
                          </MathJax>
                        </div>
                      </div>
                      <div className="">
                        Here's a breakdown of the current system:
                      </div>
                      <ul className="docs-list">
                        <li className="">
                          <MathJax>
                            <GoSquareFill className="text-lg inline" />
                            &nbsp;The maximum final score, {"\\(S\\)"}, for each
                            director is 10. This is achieved by adding a rating
                            score and a watch score together, which respectively
                            weighs 60% and 40%.
                          </MathJax>
                        </li>
                        <li className="">
                          <MathJax>
                            <GoSquareFill className="text-lg inline" />
                            The rating score, {"\\(f(a)\\)"}, is simply the
                            average star-rating that a director has (maximum
                            3.0), which gets multiplied by 2 to make up maximum
                            6/10 of the final score. If a director has no rated
                            film, their rating score defaults to 0.
                          </MathJax>
                        </li>
                        <li className="">
                          <MathJax>
                            <GoSquareFill className="text-lg inline" />
                            The watch score, {"\\(f(b)\\)"}, was created based
                            on this scenario: You've only seen one film from a
                            new director and decided to give it 3 stars. If we
                            simply calculate the average rating and convert it
                            to a scale of 10, this director gets a 10/10.
                            Meanwhile, your favorite director of all time has
                            made a lot of 3-star films, but also had a couple
                            1-star or 2-star films. Their average rating is
                            something like 2.4/3, which translates to an 8/10.
                            How can your favorite director of all time score
                            lower than a director who you'd just discovered?
                          </MathJax>
                        </li>
                        <li className="">
                          <GoSquareFill className="text-lg inline" />
                          In a way, the watch score is like a membership card
                          that gets more holes punched the more you revisit a
                          store. It rewards a director for how often you go to
                          them for a good cinematic experience. By the time
                          you've watched the 9th film from the same director, it
                          seems safe to assume that they've earned your utmost
                          loyalty--and therefore earning the maximum 'reward'
                          possible.
                        </li>
                        <li className="">
                          <span>
                            <MathJax>
                              {" "}
                              <GoSquareFill className="text-lg inline mb-1" />
                              &nbsp;In order to calculate the watch score, we
                              first feed the number of films user has watched by
                              a target director, {"\\(b\\)"}, into a
                              &nbsp;function,{" "}
                              {
                                "\\(\\min(1, \\frac{\\log{(b+1)}}{\\log{10}})\\)"
                              }
                              . Here's a visualization of this function.
                            </MathJax>{" "}
                          </span>
                        </li>
                        <img
                          src="/directoreq.png"
                          alt="log equation used to calculate watch score. credits: desmos.com"
                          className="docs-img"
                        />
                        <li className="">
                          <span>
                            <GoSquareFill className="text-lg inline mb-1" />
                            &nbsp;This function aims to give directors with 1-3
                            watched films a very quick jumpstart, provide a
                            linear ascend for those with 4-6 watched films,
                            slowly level out the curve for those with 7-9
                            watched films, and finally cap the score at 1 for
                            those who've had 9+ watched films. Multiplying the
                            result of this function by 4, we derive a maximum
                            4/10 for the watch score. This distribution
                            addresses two problems.
                          </span>
                        </li>
                        <ul className="ml-5 mr-5 flex flex-col gap-2">
                          <li className="">
                            <span>
                              <span className="font-bold">(1)</span> The
                              scenario above can be avoided: your all-time
                              favorite director will most likely score higher
                              than others despite having made a couple
                              non-perfect films.
                            </span>
                          </li>
                          <li className="">
                            <span>
                              <span className="font-bold">(2)</span> We neither
                              want to penalize a director for having too few
                              watched films (the initial jumpstart), nor
                              overcompensate them for having lots of watched
                              films (the maximum cap).
                            </span>
                          </li>
                        </ul>
                        <li className="">
                          <span>
                            <GoSquareFill className="text-lg inline mb-1" />
                            &nbsp; Filmmaking is not equally easy for directors
                            around the world, whether it comes to starting a
                            production, or getting their work to the audience.
                            Those who are established will be likely to have
                            more of their films watched, whereas those who are
                            just starting out will have fewer to showcase. In
                            avoiding a linear slope, our goal is to even out the
                            playing field for these two groups. Your go-to
                            director might get ranked top, but an excellent
                            budding filmmaker will not get left far behind
                            either.
                          </span>
                        </li>
                      </ul>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">Has a suggestion?</div>
                      <div className="">
                        This scoring system is by no means perfect. If you have
                        any thoughts, we'd love to{" "}
                        <Link
                          to="/contact"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-800 cursor-pointer">
                          hear more from you!
                        </Link>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Critical review - voting bias*/}
                <section className="flex flex-col p-5 gap-10 mb-20 font-light">
                  <div className="uppercase flex flex-col gap-2">
                    <div id="crit-review" className="docs-sectionCategory">
                      Critical review
                    </div>
                    <div id="crit-review-bias" className="docs-sectionTitle">
                      VOTING BIAS
                    </div>
                  </div>
                  <div className="flex flex-col gap-20">
                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">The Database</div>
                      <div className="">
                        While{" "}
                        <a
                          href="https://www.themoviedb.org/?language=en-US"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-800 cursor-pointer">
                          The Movies Database
                        </a>{" "}
                        does not publicly release the demographics of its
                        voters, we can sense a bias in the voting system through
                        a couple observations.
                      </div>
                      <ul className="docs-list">
                        <li className="">
                          <GoSquareFill className="text-lg inline" />
                          &nbsp;As an example, India has been consistenly
                          surpassing the United States in the last two decades
                          when it comes to number of feature films produced
                          anually
                          <a
                            href="https://www.wipo.int/en/web/global-innovation-index/w/blogs/2025/global-film-production"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-800 cursor-pointer">
                            <sup> 1</sup>
                          </a>
                          . In 2023, 2562 feature films were produced in India,
                          which is a whopping five-fold compared to the 510
                          productions that took place in the U.S
                          <a
                            href="https://www.wipo.int/en/web/global-innovation-index/w/blogs/2025/global-film-production"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-800 cursor-pointer">
                            <sup> 2</sup>
                          </a>
                          . This, together with the fact that India currently
                          has the highest population in the world (1.46+ billion
                          as of 2025
                          <a
                            href="https://www.worldometers.info/world-population/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-800 cursor-pointer">
                            <sup> 3</sup>
                          </a>
                          ), would make one think that there must be a lot of
                          Indian cinema enjoyers. Perhaps at least as many as
                          there would be in the United States.
                        </li>
                        <a
                          href="https://www.wipo.int/en/web/global-innovation-index/w/blogs/2025/global-film-production"
                          target="_blank"
                          rel="noopener noreferrer">
                          <img
                            src="/productiondata.png"
                            alt="Statistics for countries prominent in anual film production."
                            className="docs-img border-2"
                          />
                        </a>
                        <li className="">
                          <GoSquareFill className="text-lg inline" />
                          &nbsp;As this is being written, according to TMDB, the
                          United States' most voted films of all time has over
                          38000+ votes (
                          <a
                            href="https://thefilmatlas.org/#/films/157336"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="italic text-blue-800 cursor-pointer">
                            Interstellar
                          </a>
                          , 2014, dir. Christopher Nolan, 8.5 average rating),
                          meanwhile India's has 4500+ votes (
                          <a
                            href="https://thefilmatlas.org/#/films/19404"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="italic text-blue-800 cursor-pointer">
                            Dilwale Dulhania Le Jayenge
                          </a>
                          , 1995, dir. Aditya Chopra, 8.5 average rating).
                          <span className="italic"> Interstellar</span>,
                          undoubtedly an international box-office hit (ranked
                          #125 worldwide lifetime{" "}
                          <a
                            href="https://www.boxofficemojo.com/chart/top_lifetime_gross/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-800 cursor-pointer">
                            <sup> 4</sup>
                          </a>
                          ), must have gathered a lot of attention from TMDB
                          users. To gain another perspective, however,{" "}
                          <span className="italic">
                            Dilwale Dulhania Le Jayenge (DDLJ)
                          </span>{" "}
                          is the second highest-grossing Indian film in the
                          1990s, and the longest-running film in the history of
                          Indian cinema, which is still being shown on the big
                          screen in Mumbai since its release in 1995{" "}
                          <a
                            href="https://www.cnn.com/2025/10/20/style/ddlj-bollywood-30-years-anniversary-intl-hnk-dst"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-800 cursor-pointer">
                            <sup> 5</sup>
                          </a>
                          .
                        </li>
                        <a
                          href="https://thefilmatlas.org/#/films/157336"
                          target="_blank"
                          rel="noopener noreferrer">
                          <img
                            src="/interstellar.png"
                            alt="Interstellar film card."
                            className="docs-img border-0"
                          />
                        </a>

                        <li className="">
                          <span>
                            <GoSquareFill className="text-lg inline mb-1" />
                            &nbsp;This not to say that{" "}
                            <span className="italic">DDLJ</span> should get as
                            many votes as{" "}
                            <span className="italic"> Interstellar</span>. They
                            are two completely different films of two completely
                            different genres, and speak to different crowds.
                            Howerver, one thing we can perhaps all agree on is
                            how well-known these two films are in their
                            respective countries of production, with{" "}
                            <span className="italic"> Interstellar</span>{" "}
                            undoubtedly gathering more international interests.
                          </span>
                        </li>
                        <a
                          href="https://thefilmatlas.org/#/films/19404"
                          target="_blank"
                          rel="noopener noreferrer">
                          <img
                            src="/dilwale.png"
                            alt="Interstellar film card."
                            className="docs-img border-0"
                          />
                        </a>
                        <li className="">
                          <span>
                            <GoSquareFill className="text-lg inline mb-1" />
                            &nbsp;The statistically closest film to{" "}
                            <span className="italic">DDLJ</span> (4500+ votes,
                            8.5 average rating) we can pick from the U.S. is
                            probably{" "}
                            <a
                              href="https://thefilmatlas.org/#/films/1585"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="italic text-blue-800 cursor-pointer">
                              It's A Wonderful Life
                            </a>{" "}
                            (4600+ votes, 8.3 average rating). While both films
                            are culturally significant to their respective
                            countries and reference many distinct regional
                            nuances (e.g. Christmas season in the U.S., a
                            traditional wedding in India, etc.),{" "}
                            <span className="italic">
                              It's A Wonderful Life
                            </span>{" "}
                            was made in 1946, 50 years before{" "}
                            <span className="italic">DDLJ</span>.
                          </span>
                        </li>
                        <li className="">
                          <span>
                            <GoSquareFill className="text-lg inline mb-1" />
                            &nbsp;Thus, statistically speaking, the Hollywood
                            peer of one of the most famous Bollywood production
                            of all time, is a film that was made half a century
                            before it. This may speak to the low level of
                            attention that non-Hollywood cinema has on voting
                            platforms like TMDB. A film can be an important
                            cultural phenomenon for a country four times the
                            size of the U.S., but still seems statistically
                            insignificant compared to the majority of U.S.
                            productions made within its time.
                          </span>
                        </li>
                        <a
                          href="https://thefilmatlas.org/#/films/1585"
                          target="_blank"
                          rel="noopener noreferrer">
                          <img
                            src="/itsawonderfullife.png"
                            alt="Interstellar film card."
                            className="docs-img border-0"
                          />
                        </a>
                        <li className="">
                          <span>
                            <GoSquareFill className="text-lg inline mb-1" />
                            &nbsp;To expand this observation even further, let
                            us take a look at{" "}
                            <a
                              href="https://thefilmatlas.org/#/films/980477"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="italic text-blue-800 cursor-pointer">
                              Ne Zha II
                            </a>
                            , the highest grossing Chinese film of all time,
                            highest grossing animated film of all time (and the
                            first non-American, non-English-language film to
                            earn such position), and the first Chinese film to
                            ever make it to worldwide top 5 highest-grossing
                            film of all time{" "}
                            <a
                              href="https://www.nytimes.com/2025/02/10/business/china-box-office-ne-zha-2.html"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-800 cursor-pointer">
                              <sup> 6</sup>
                            </a>
                            . It currently has less than 500 votes on TMDB.
                            What's disheartening is that when you click on the
                            profile page for its director,{" "}
                            <a
                              href="https://thefilmatlas.org/#/person/director/2367353"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-800 cursor-pointer">
                              Jiao Zi
                            </a>
                            , there's no biography available (as this is being
                            written).
                          </span>
                        </li>
                        <a
                          href="https://thefilmatlas.org/#/films/980477"
                          target="_blank"
                          rel="noopener noreferrer">
                          <img
                            src="/nezha2.png"
                            alt="Interstellar film card."
                            className="docs-img border-0"
                          />
                        </a>
                        <li className="">
                          <span>
                            <GoSquareFill className="text-lg inline mb-1" />
                            &nbsp;Getting back to the point made about cinema
                            enjoyers in the first place. India was picked as an
                            example because it's a country with a huge
                            population that does not seem adequately represented
                            in TMDB's voting system. However, given our most
                            recent example, it is certainly not the only country
                            that is in this situation.
                          </span>
                        </li>
                      </ul>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">Voters Demographics</div>
                      <div className="">
                        Let us continue entertaining the concern above with a
                        Venn diagram.
                      </div>
                      <img
                        src="/venn.png"
                        alt="Interstellar film card."
                        className="docs-img border-0"
                      />
                      <ul className="docs-list">
                        <li className="">
                          <GoSquareFill className="text-lg inline" />
                          &nbsp;This Venn diagram is a demonstration of an
                          imagined, but not entirely impossible scenario. Let's
                          say that all film watchers around the world are
                          divided into three types: those who only watch U.S.
                          films, those who only watch Indian films, and those
                          who only watch films from neither countries above. At
                          the intersection of these three group is an orange
                          region that represents film watchers who
                          indiscriminately watch films from all the regions
                          mentioned.
                        </li>
                        <li className="">
                          <GoSquareFill className="text-lg inline" />
                          &nbsp;The blue, star-shapped region represents all
                          users from TMDB who'd casted a vote in the past
                          (assuming all TMDB voters are film watchers). It is
                          necessary for this region to take this shape because
                          we cannot assume all watchers of films around the
                          world has voted on TMDB, nor can we assume TMDB voters
                          intersect with certain groups but not others (e.g.
                          what if some TMDB voters only watch Indian films, or
                          some only watch films that are from the U.S. and other
                          countries, etc.)
                        </li>
                        <li className="">
                          <GoSquareFill className="text-lg inline" />
                          &nbsp;The intersection between the orange region and
                          the blue region forms the subset of TMDB voters who
                          also indiscriminately watch films around the world,
                          which is colored in green. Finally, the inflated
                          portion of the star-shaped region, which is colored in
                          red, represents a subset of TMDB voters who
                          exclusively watches films from the United States.
                        </li>
                        <li className="">
                          <GoSquareFill className="text-lg inline" />
                          &nbsp;By no means is this diagram based on concrete
                          data--indeed, it seems extreme to imagine a group of
                          people who refuse to watch films from anywhere outside
                          of the U.S. However, the purpose of staging this
                          scenario is to ask the question: what if the majority
                          of voters on TMDB only watch films from very specific
                          regions? Wouldn't the preferences of those belonging
                          to the red region overshadow the preferences of those
                          inside the green region? And how would that affect the
                          representation of films watched by people outside of
                          the red region?
                        </li>
                        <img
                          src="/languages.png"
                          alt="Interstellar film card."
                          className="docs-img border-0"
                        />
                        <li className="">
                          <GoSquareFill className="text-lg inline" />
                          &nbsp;The graph above is the result of scanning
                          through 45,000 films on TMDB released before 2018,
                          extracting the original language of each film, and
                          plotting them onto a simple graph.
                        </li>
                        <li className="">
                          <GoSquareFill className="text-lg inline" />
                          &nbsp;The blue spike represents the number of films
                          that have English as its original language. Films that
                          have French as its original language come second in
                          this chart, followed by those that has Japanese,
                          Italian, German, Spanish, Russian, Korean, Hindi,
                          Chinese as their original language. After that, the
                          numbers for other languages are too low for them to be
                          discernible.
                        </li>
                        <li className="">
                          <GoSquareFill className="text-lg inline" />
                          &nbsp;The dominance of English-language films on TMDB
                          is simply striking. There are 89 distinct original
                          languages in the database, and English alone takes up
                          more than 70%. This number does not seem to match with
                          the very first graph that we started with, where
                          countries like India, Japan, China, are among the most
                          prolific anual producers of feature films. A huge
                          linguistic bias, combined with a high possibility of
                          bias in the voting demographics (who also happens to
                          speak the most dominant language), creates the
                          elephant in the room for The Film Atlas.
                        </li>
                      </ul>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">What Can We Do?</div>
                      <div className="">
                        The Movies Databse is by no means perfect, but it is an
                        extremely comprehensive database, where one will find
                        most films that they need to. And even when they don't,
                        there's the freedom to add entries for films they cannot
                        find.
                      </div>
                      <div className="">
                        Knowing its flaws, we still decided to use The Movies
                        Database because of its potentials. The Film Atlas, in a
                        nutshell, is using a biased database to try and counter
                        the effects of its own biases.
                      </div>
                      <div className="">
                        <a>Phase Two</a> of The Film Atlas involves creating our
                        own film database on a more granular level (think cities
                        instead of countries). This will give us a lot more room
                        to experiment and develop an archive system that is less
                        prone to biases.
                      </div>
                      <div className="">
                        In the mean time, for the users, this might mean that
                        the vote count and/or average rating will have to be
                        lowered for films from less prominent regions for them
                        to show up in Discover Mode on the Map Page.
                      </div>
                    </div>
                  </div>
                </section>

                {/* Acknowledgment */}
                <section className="flex flex-col p-5 gap-10 mb-20 font-light">
                  <div className="uppercase flex flex-col gap-2">
                    <div id="acknowledgement" className="docs-sectionCategory">
                      Acknowledgement
                    </div>
                    <div className="docs-sectionTitle">SPECIAL THANKS TO</div>
                  </div>
                  <div className="flex flex-col gap-20">
                    <div className="flex flex-col gap-2">
                      <a
                        href="https://www.themoviedb.org/?language=en-US"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-800 cursor-pointer">
                        <div className="docs-subtitle hover:text-blue-800">
                          The Movies Database
                        </div>
                      </a>{" "}
                      <div className="">For the API.</div>
                      <a
                        href="https://www.themoviedb.org/?language=en-US"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="max-w-[15rem]">
                        <img
                          src="/tmdb.png"
                          alt="TMDB log."
                          className="docs-img border-0 max-w-[15rem]"
                        />
                      </a>
                    </div>
                    <div className="flex flex-col gap-2">
                      <a
                        href="https://maplibre.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-800 cursor-pointer">
                        <div className="docs-subtitle hover:text-blue-800">
                          Map Libre
                        </div>
                      </a>{" "}
                      <div className="">For the mapping library.</div>
                      <a
                        href="https://maplibre.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="max-w-[15rem]">
                        <img
                          src="/maplibre.png"
                          alt="Map Libre logo."
                          className="docs-img border-0 max-w-[15rem]"
                        />
                      </a>
                    </div>
                    <div className="flex flex-col gap-2">
                      <a
                        href="https://www.maptiler.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-800 cursor-pointer">
                        <div className="docs-subtitle hover:text-blue-800">
                          Map Tiler
                        </div>
                      </a>{" "}
                      <div className="">For the map layout.</div>
                      <a
                        href="https://www.maptiler.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="max-w-[15rem]">
                        <img
                          src="/maptiler.svg"
                          alt="Map Tiler logo."
                          className="docs-img border-0 max-w-[15rem]"
                        />
                      </a>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="docs-subtitle">
                        And These Lovely People{" "}
                      </div>
                      <div className="">
                        For their continual and unconditional support.
                      </div>
                      <div className="italic">
                        R. Mercedes, A. Saleh, I. Uddin, Z. Hossain, C. Dang
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MathJaxContext>
  )
}
