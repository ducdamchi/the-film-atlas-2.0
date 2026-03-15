import React, { useContext } from "react"
import NavBar from "./Shared/Navigation-Search/NavBar"
import QuickSearchModal from "./Shared/Navigation-Search/QuickSearchModal"
import { GoSquareFill } from "react-icons/go"
import { AuthContext } from "../Utils/authContext"
import { RiProgress8Line, RiProgress4Line } from "react-icons/ri"
import { useNavigate } from "react-router-dom"
import useCommandKey from "../Hooks/useCommandKey"
import { Link } from "react-router-dom"
import { BiLogoGithub } from "react-icons/bi"

export default function About() {
  const navigate = useNavigate()
  const { searchModalOpen, setSearchModalOpen } = useContext(AuthContext)
  function toggleSearchModal() {
    setSearchModalOpen((status) => !status)
  }
  useCommandKey(toggleSearchModal, "k")
  return (
    <div className="font-primary mt-20 mb-20 min-h-screen">
      {searchModalOpen && (
        <QuickSearchModal
          searchModalOpen={searchModalOpen}
          setSearchModalOpen={setSearchModalOpen}
        />
      )}
      <div className="flex flex-col items-center">
        <NavBar />
        <div className="font-heading page-title">About</div>

        <div className="md:p-10 max-w-[40rem] md:text-lg md:max-w-[45rem] flex flex-col gap-10">
          <section className="p-5">
            {/* <div className="landing-sectionTitle">OVERVIEW</div> */}
            <div className="">
              The Film Atlas is a tool for movie afficionados and curators to
              visualize the geographical diversity of their collections. It does
              so by creating a choropleth map of the world based on data from a
              user's watched films: the more films watched from a region, the
              darker the shade of that region will be. This simple coloring
              exercise can help viewers become aware of biases in the global
              distribution and consumption of media, while advocating for the
              appreciation of cinema from underrepresented regions in the world.
            </div>
          </section>
          <section className="flex flex-col p-5 gap-5">
            <div className="uppercase inline-block text-lg md:text-xl">
              <span className="inline-block ">
                PHASE ONE&nbsp;&nbsp;|&nbsp;&nbsp;
              </span>
              <span className="inline font-bold">
                SEARCH, INTERACTION & MAP DISPLAY{" "}
              </span>
            </div>
            <div className="w-[10rem] flex items-center justify-start">
              <RiProgress8Line className="text-green-600" />
              <span className="italic ">&nbsp; Completed</span>
            </div>
            <div>
              <div className="font-bold text-lg md:text-xl">Overview</div>
              <div>
                In the initial phase, The Film Atlas aims to function as (1) an
                interactive map that promotes engagement with world cinema, and
                (2) a movie lookup site that emphasizes the curatorial
                experience. The map component will allow user to discover films
                from any country that they click on, and apply relevant
                sorts/filters. The curatorial experience centers on treating
                each director as the{" "}
                <span className="italic">auteur principal</span> of a film, and
                implementing a strict{" "}
                <Link
                  to="/docs#curation-stars"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-800 cursor-pointer">
                  3-star rating system
                </Link>{" "}
                on each of their creation. These two functionalities work
                together to to minimize user input, while maximizing the
                visualization of their engagement with cinema from a cultural,
                geographical, and even gendered perspective.
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex flex-col">
                <div className="font-bold text-lg md:text-xl">Key features</div>
                <ul className="ml-2">
                  <li className="">
                    <span>
                      <GoSquareFill className="text-lg inline mb-1" />
                      &nbsp;Search, filter, and sort over 1 million films and
                      associated directors from{" "}
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href="https://www.themoviedb.org/?language=en-US"
                        className="text-blue-800">
                        The Movie Database
                      </a>
                      .
                    </span>
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline" />
                    &nbsp;Like a film (Watched), save it for later (Watchlist),
                    and/or Rate it.
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline" />
                    &nbsp;Watched films are projected onto a choropleth map
                    based on their origin(s).
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline" />
                    &nbsp;Each director gets assigned a{" "}
                    <Link
                      to="/docs#curation-score"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-800 cursor-pointer">
                      score
                    </Link>{" "}
                    based on the user's interaction with their films.
                  </li>
                </ul>
              </div>
            </div>
          </section>
          <section className="flex flex-col p-5 gap-5">
            <div className="uppercase text-lg md:text-xl">
              <span className="">PHASE TWO&nbsp;&nbsp;|&nbsp;&nbsp;</span>
              <span className="font-bold">REGIONAL FOCUS</span>
            </div>
            <div className="w-[10rem] flex items-center justify-start">
              <RiProgress4Line className="text-amber-500" />
              <span className="italic">&nbsp; In progress</span>
            </div>
            <div className="">
              <div className="font-bold text-lg md:text-xl">Overview</div>
              <div>
                In the second phase, The Film Atlas aims to granularize its map
                to serve as an archiver of films from culturally rich and
                distinctive cities around the world. It hopes to do so by
                collaborating with local organizations to create its own
                database of films that had left a significant cultural impact on
                the chosen city, as well as finding ways to make those films
                more accessible to the public. The Film Atlas would also like to
                serve as a resource provider for filmmakers looking for
                opportunities in such cities, featuring information concerning
                grants, fellowships, festivals, or community gatherings.
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex flex-col">
                <div className="font-bold text-lg md:text-xl">Key tasks</div>
                <ul className="ml-2">
                  <li className="">
                    <GoSquareFill className="text-lg inline mb-1" />
                    &nbsp;Design independent database and create custom
                    management tools for collection and input.
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline mb-1" />
                    &nbsp;Community outreach and engagement.
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline mb-1" />
                    &nbsp;Develop new features based on available data.
                  </li>
                </ul>
              </div>
            </div>
          </section>
          <section className="mt-10 flex items-center justify-center">
            <div>
              Interested?{" "}
              <span
                onClick={() => {
                  navigate("/contact")
                }}
                className="text-blue-800 cursor-pointer">
                Join our team!
              </span>
            </div>
          </section>
          {/* <section className="mt-20">
            <div className="flex items-center justify-center gap-2">
              Developed by
              <a
                href="https://github.com/ducdamchi"
                target="_blank"
                rel="noopener noreferrer">
                <BiLogoGithub className="text-3xl hover:text-blue-800" />
              </a>
              Duc Dam
            </div>
          </section> */}
        </div>
      </div>
    </div>
  )
}
