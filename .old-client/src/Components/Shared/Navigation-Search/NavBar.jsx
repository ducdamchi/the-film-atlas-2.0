import { useContext, useState, useRef, useEffect, useCallback } from "react"
import { Link, useMatch, useResolvedPath, useNavigate } from "react-router-dom"
import { AuthContext } from "../../../Utils/authContext"
import { BiSearchAlt2, BiMenu, BiSolidMessageRoundedDots } from "react-icons/bi"
import { MdClose, MdMenu, MdOutlineSettings, MdSearch } from "react-icons/md"
import { TbArrowBigRightLinesFilled } from "react-icons/tb"

import { ChevronDown } from "lucide-react"
import { usePersistedState } from "../../../Hooks/usePersistedState"
import { Button } from "../../ui/button"

export default function NavBar() {
  const { authState, setAuthState, searchModalOpen, setSearchModalOpen } =
    useContext(AuthContext)

  const [menuOpened, setMenuOpened] = usePersistedState("navbar-menuOpened", {
    isOpened: false,
    isNeutral: true, //set to true when menu is closed passively (when browsing, etc.), set to false when user actively clicked close. Initial value should be set to false for user first click.
  })

  const [settingsOpened, setSettingsOpened] = usePersistedState(
    "navbar-settingsOpened",
    {
      isOpened: false,
      isNeutral: true, //set to true when menu is closed passively (when browsing, etc.), set to false when user actively clicked close. Initial value should be set to false for user first click.
    },
  )
  const menuRef = useRef(null)
  const menuBorderBottom = useRef(null)
  const menuBorderRight = useRef(null)
  const settingsRef = useRef(null)
  const settingsBorderBottom = useRef(null)
  const settingsBorderRight = useRef(null)
  const navigate = useNavigate()
  const [screenWidth, setScreenWidth] = useState(null)
  const [mobileMenu, setMobileMenu] = useState(null)
  const [infoDropdownOpen, setInfoDropdownOpen] = useState(false)
  const infoDropdownRef = useRef(null)
  const [mobileInfoDropdownOpen, setMobileInfoDropdownOpen] = useState(false)

  //unit: rem
  const navbarHeight = 4.5
  const menuHeightBase = 8.5
  const menuHeightExpanded = 13.5
  const menuHeight = mobileInfoDropdownOpen
    ? menuHeightExpanded
    : menuHeightBase
  const setttingsHeight_Authed = 2.5
  const setttingsHeight_Unauthed = 4.2
  const navbarBorderWidth = 0
  const borderWidth = 0.3

  function CustomLink({
    to,
    children,
    underline = true,
    exact = true,
    ...props
  }) {
    // to: URL path (e.g., "/about", "/contact")
    // children: Content inside the link (text, icons, etc.)
    // ...props: Any other props passed to the component (className, onClick, etc.)
    const resolvedPath = useResolvedPath(to)
    const isActive = useMatch({ path: resolvedPath.pathname, end: exact })
    return (
      <div
        className={
          isActive && underline
            ? "underline decoration-solid decoration-2 underline-offset-4"
            : ""
        }>
        <Link to={to} {...props}>
          {children}
        </Link>
      </div>
    )
  }

  function animateMenu(
    menuState,
    setMenuState,
    menuRef,
    borderBottomRef,
    borderSideRef,
    translateXValue,
    translateYValue,
  ) {
    if (menuRef.current && borderBottomRef.current && borderSideRef.current) {
      // console.log("all refs current")
      let timer1, timer2
      if (!menuState.isNeutral) {
        if (menuState.isOpened) {
          // Pre-position off-screen while still hidden so there is always
          // a starting offset for the CSS transition to animate from.
          menuRef.current.style.transform = `translateX(${translateXValue}px)`
          borderBottomRef.current.style.transform = `translateX(${translateXValue}px)`
          borderSideRef.current.style.transform = `translateY(${translateYValue}px)`

          menuRef.current.style.display = "flex"
          borderBottomRef.current.style.display = "block"
          borderSideRef.current.style.display = "block"
          timer1 = setTimeout(() => {
            menuRef.current.style.transform = "translateX(0px)"
          }, 400)

          timer2 = setTimeout(() => {
            borderBottomRef.current.style.transform = "translateX(0px)"
            borderSideRef.current.style.transform = "translateY(0px)"
          }, 200)
          setMenuState((prevState) => ({ ...prevState, isNeutral: true }))
        } else {
          // console.log("trying to transition close menu")
          timer1 = setTimeout(() => {
            menuRef.current.style.transform = `translateX(${translateXValue}px)`
          }, 200)
          timer2 = setTimeout(() => {
            menuRef.current.style.display = "none"
            borderBottomRef.current.style.display = "none"
            borderSideRef.current.style.display = "none"
          }, 400)
          borderBottomRef.current.style.transform = `translateX(${translateXValue}px)`
          borderSideRef.current.style.transform = `translateY(${translateYValue}px)`
          setMenuState((prevState) => ({ ...prevState, isNeutral: true }))
        }
      }

      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
      }
    }
  }

  const logOut = () => {
    localStorage.removeItem("accessToken")
    localStorage.removeItem("films-searchInput")
    localStorage.removeItem("films-isSearching")
    localStorage.removeItem("films-sortBy")
    localStorage.removeItem("films-sortDirection")
    localStorage.removeItem("films-numStars")
    localStorage.removeItem("films-queryString")
    localStorage.removeItem("films-scrollPosition")
    localStorage.removeItem("map-popupInfo")
    localStorage.removeItem("map-suggestedFilmList")
    localStorage.removeItem("map-sortBy")
    localStorage.removeItem("map-sortDirection")
    localStorage.removeItem("map-queryString")
    localStorage.removeItem("map-numStars")
    localStorage.removeItem("map-discoverBy")
    localStorage.removeItem("map-scrollPosition")
    localStorage.removeItem("map-ratingRange")
    localStorage.removeItem("map-tempRating")
    localStorage.removeItem("map-voteCountRange")
    localStorage.removeItem("map-tempVoteCount")
    localStorage.removeItem("directors-searchInput")
    localStorage.removeItem("directors-isSearching")
    localStorage.removeItem("directors-numStars")
    localStorage.removeItem("directors-sortBy")
    localStorage.removeItem("directors-sortDirection")
    localStorage.removeItem("directors-queryString")
    localStorage.removeItem("directors-scrollPosition")
    localStorage.removeItem("directorLanding-scrollPosition")
    localStorage.removeItem("navbar-menuOpened")
    localStorage.removeItem("navbar-settingsOpened")

    setAuthState({ username: "", id: 0, status: false })
    navigate("/login")
  }

  // On mount, always reset menus to closed state.
  // usePersistedState restores from localStorage, so if the user had a menu open
  // when they last left the page, the persisted isOpened:true would cause the
  // hamburger icon to show the close icon while the panel stays hidden (animateMenu
  // won't run because isNeutral:true). Forcing closed here prevents that inconsistency.
  useEffect(() => {
    setMenuOpened({ isOpened: false, isNeutral: true })
    setSettingsOpened({ isOpened: false, isNeutral: true })
  }, [])

  useEffect(() => {
    if (!menuOpened.isOpened) {
      setMobileInfoDropdownOpen(false)
    }
    // console.log("Before menu animation: ", menuOpened)
    animateMenu(
      menuOpened,
      setMenuOpened,
      menuRef,
      menuBorderBottom,
      menuBorderRight,
      -500,
      -400,
    )
  }, [menuOpened])

  useEffect(() => {
    animateMenu(
      settingsOpened,
      setSettingsOpened,
      settingsRef,
      settingsBorderBottom,
      settingsBorderRight,
      500,
      -200,
    )
  }, [settingsOpened])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        infoDropdownRef.current &&
        !infoDropdownRef.current.contains(e.target)
      ) {
        setInfoDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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
      setMobileMenu(false)
      setMenuOpened(false)
    } else {
      setMobileMenu(true)
    }
  }, [screenWidth])

  return (
    <div
      className={`fixed top-0 left-0 font-primary flex items-center justify-between w-screen p-0 md:p-3 md:pl-[2rem] md:pr-[2rem] bg-black text-stone-200 border-[#b8d5e5] z-400`}
      style={{ height: `${navbarHeight}rem` }}>
      {/* LEFT SIDE */}
      <div className="flex items-center justify-center gap-3 lg:gap-5 min-w-[12rem] ml-4">
        {mobileMenu && (
          <>
            {/* MOBILE - APP NAME */}
            <div className="lg:hidden h-full flex items-center justify-center pt-0 z-30">
              <button
                className="mr-2 relative w-5 h-5"
                onClick={() =>
                  setMenuOpened({
                    isOpened: !menuOpened.isOpened,
                    isNeutral: false,
                  })
                }>
                <MdMenu
                  className={`text-xl absolute inset-0 transition-all duration-300 ease-in-out ${
                    menuOpened.isOpened
                      ? "opacity-0 rotate-90 scale-50"
                      : "opacity-100 rotate-0 scale-100"
                  }`}
                />
                <MdClose
                  className={`text-xl absolute inset-0 transition-all duration-300 ease-in-out ${
                    menuOpened.isOpened
                      ? "opacity-100 rotate-0 scale-100"
                      : "opacity-0 -rotate-90 scale-50"
                  }`}
                />
              </button>
              <span
                onClick={() => {
                  navigate("/about")
                }}
                className="font-logo text-base uppercase font-black flex items-center justify-center p-1 cursor-pointer">
                The Film Atlas
              </span>
              <button
                className="flex items-center justify-center ml-2 p-[5px] pl-[10px] pr-[10px] rounded-full bg-stone-200 text-stone-900 cursor-pointer"
                onClick={() => {
                  setSearchModalOpen(true)
                }}>
                <BiSearchAlt2 className="text-[10px]" />
              </button>
            </div>

            {/* MOBILE - HAMBURGER MENU CONTENT */}
            <div
              className={`hidden absolute z-20 left-0 bg-black border-[#b8d5e5] w-[50vw] pl-5 pb-5 pt- transition-all ease-out duration-200 font-light z-100 md:pl-12`}
              style={{
                height: `${menuHeight}rem`,
                top: `${navbarHeight - navbarBorderWidth}rem`,
              }}
              ref={menuRef}>
              <ul className="flex flex-col gap-2 text-sm">
                <CustomLink
                  to="/map"
                  exact={false}
                  onClick={() => {
                    setMenuOpened({ isOpened: false, isNeutral: true })
                    setSettingsOpened({ isOpened: false, isNeutral: true })
                  }}>
                  MAP
                </CustomLink>
                <CustomLink
                  to="/films"
                  exact={false}
                  onClick={() => {
                    setMenuOpened({ isOpened: false, isNeutral: true })
                    setSettingsOpened({
                      isOpened: false,
                      isNeutral: true,
                    })
                  }}>
                  FILMS
                </CustomLink>
                <CustomLink
                  to="/directors"
                  exact={false}
                  onClick={() => {
                    setMenuOpened({ isOpened: false, isNeutral: true })
                    setSettingsOpened({ isOpened: false, isNeutral: true })
                  }}>
                  DIRECTORS
                </CustomLink>
                <div>
                  <button
                    className="flex items-center gap-1 uppercase"
                    onClick={() => setMobileInfoDropdownOpen((prev) => !prev)}>
                    INFO
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${mobileInfoDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {mobileInfoDropdownOpen && (
                    <ul className="flex flex-col gap-2 pl-3 pt-2">
                      <CustomLink
                        to="/about"
                        exact={false}
                        onClick={() => {
                          setMenuOpened({ isOpened: false, isNeutral: true })
                          setSettingsOpened({
                            isOpened: false,
                            isNeutral: true,
                          })
                          setMobileInfoDropdownOpen(false)
                        }}>
                        ABOUT
                      </CustomLink>
                      <CustomLink
                        to="/contact"
                        exact={false}
                        onClick={() => {
                          setMenuOpened({ isOpened: false, isNeutral: true })
                          setSettingsOpened({
                            isOpened: false,
                            isNeutral: true,
                          })
                          setMobileInfoDropdownOpen(false)
                        }}>
                        CONTACT
                      </CustomLink>
                      <CustomLink
                        to="/docs"
                        exact={false}
                        onClick={() => {
                          setMenuOpened({ isOpened: false, isNeutral: true })
                          setSettingsOpened({
                            isOpened: false,
                            isNeutral: true,
                          })
                          setMobileInfoDropdownOpen(false)
                        }}>
                        DOCS
                      </CustomLink>
                    </ul>
                  )}
                </div>
              </ul>
            </div>
            <div
              className={`hidden absolute left-0 bg-[#d5e5b8] z-20 transition-all ease-out duration-400`}
              style={{
                height: `${borderWidth}rem`,
                width: `calc(50vw + ${borderWidth}rem)`,
                top: `${navbarHeight + menuHeight - navbarBorderWidth}rem`,
              }}
              ref={menuBorderBottom}></div>
            <div
              className="hidden absolute w-[0.4rem] h-[6rem] left-[50vw] top-[3rem] bg-[#e5b8d5] z-20 transition-all ease-out duration-400"
              style={{
                height: `${menuHeight}rem`,
                width: `${borderWidth}rem`,
                top: `${navbarHeight - navbarBorderWidth}rem`,
              }}
              ref={menuBorderRight}></div>
          </>
        )}

        {/* LAPTOP - APP NAME*/}
        <div className="hidden lg:flex h-full items-center justify-center">
          <span
            onClick={() => {
              navigate("/about")
            }}
            className="font-logo font-black uppercase text-lg lg:text-xl cursor-pointer">
            The Film Atlas
          </span>
        </div>

        {/* LAPTOP - HORIZONTAL MENU */}
        <div className="hidden lg:flex text-sm font-extralight flex h-full mt-1 items-center gap-2 lg:gap-5 pb-1">
          <ul className="flex gap-4 lg:gap-5 p-2">
            <CustomLink to="/map" exact={false}>
              MAP
            </CustomLink>
            <CustomLink to="/films" exact={false}>
              FILMS
            </CustomLink>
            <CustomLink to="/directors" exact={false}>
              DIRECTORS
            </CustomLink>
            <div className="relative" ref={infoDropdownRef}>
              <button
                className="flex items-center gap-1 uppercase hover:underline decoration-solid decoration-2 underline-offset-4"
                onClick={() => setInfoDropdownOpen((prev) => !prev)}>
                INFO
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 ${infoDropdownOpen ? "rotate-180" : "rotate-0"}`}
                />
              </button>
              <div
                className={`absolute top-full left-0 mt-2 bg-black border border-stone-600 flex flex-col min-w-[8rem] z-500 overflow-hidden transition-all duration-200 ease-out ${infoDropdownOpen ? "max-h-40 opacity-100 p-3 gap-2" : "max-h-0 opacity-0 p-0 gap-0"}`}>
                <CustomLink
                  to="/about"
                  exact={false}
                  onClick={() => setInfoDropdownOpen(false)}>
                  ABOUT
                </CustomLink>
                <CustomLink
                  to="/contact"
                  exact={false}
                  onClick={() => setInfoDropdownOpen(false)}>
                  CONTACT
                </CustomLink>
                <CustomLink
                  to="/docs"
                  exact={false}
                  onClick={() => setInfoDropdownOpen(false)}>
                  DOCS
                </CustomLink>
              </div>
            </div>
          </ul>
          <button
            className="flex items-center justify-center gap-1 border-0 p-1 pl-2 pr-2 rounded-full bg-stone-200 text-gray-600 cursor-pointer"
            onClick={() => {
              setSearchModalOpen(true)
            }}>
            <BiSearchAlt2 />
            {`\u2318K`}
          </button>
        </div>
      </div>

      {/* RIGHT SIDE */}
      {/* MOBILE - USER INFO / AUTH */}
      <div className="lg:hidden flex items-center justify-end gap-1 mr-4 text-sm z-100">
        {authState.status ? (
          <div>
            <div className="h-full flex items-center justify-center">
              <span className=" p-1 flex items-center justify-center font-light">{`${authState.username}`}</span>
            </div>
            <div
              className="hidden absolute z-20 right-0 bg-black border-[#b8d5e5] pl-5 pb-5 pt-2 transition-all ease-out duration-200 font-light justify-end items-center"
              style={{
                top: `${navbarHeight - navbarBorderWidth}rem`,
                width: `calc(50vw - ${borderWidth}rem)`,
                height: `${setttingsHeight_Authed}rem`,
              }}
              ref={settingsRef}>
              <button
                className="mr-5 md:mr-12 gap-2 uppercase"
                onClick={logOut}>
                log out
              </button>
            </div>
            <div
              className="hidden absolute right-0 bg-[#e5b8d5] z-20 transition-all ease-out duration-400"
              style={{
                width: `50vw`,
                height: `${borderWidth}rem`,
                top: `${navbarHeight + setttingsHeight_Authed - navbarBorderWidth}rem`,
              }}
              ref={settingsBorderBottom}></div>
            <div
              className="hidden absolute bg-[#d5e5b8] z-20 transition-all ease-out duration-400"
              style={{
                width: `${borderWidth}rem`,
                height: `${setttingsHeight_Authed}rem`,
                top: `${navbarHeight - navbarBorderWidth}rem`,
                left: "50vw",
              }}
              ref={settingsBorderRight}></div>
          </div>
        ) : (
          <div>
            <div
              className="absolute hidden z-20 right-0 bg-black border-[#b8d5e5] pl-5 pb-5 pt-0 transition-all ease-out duration-200 font-light justify-end"
              style={{
                top: `${navbarHeight - navbarBorderWidth}rem`,
                width: `calc(50vw - ${borderWidth}rem)`,
                height: `${setttingsHeight_Unauthed}rem`,
              }}
              ref={settingsRef}>
              <ul className="flex flex-col text-right mr-5 md:mr-12 gap-2 uppercase">
                <CustomLink to="/login">log in</CustomLink>
                <CustomLink to="/register">register</CustomLink>
              </ul>
            </div>
            <div
              className="hidden absolute right-0 bg-[#e5b8d5] z-20 transition-all ease-out duration-400"
              style={{
                width: `50vw`,
                height: `${borderWidth}rem`,
                top: `${navbarHeight + setttingsHeight_Unauthed - navbarBorderWidth}rem`,
              }}
              ref={settingsBorderBottom}></div>
            <div
              className="hidden absolute bg-[#d5e5b8] z-20 transition-all ease-out duration-400"
              style={{
                width: `${borderWidth}rem`,
                height: `${setttingsHeight_Unauthed}rem`,
                top: `${navbarHeight - navbarBorderWidth}rem`,
                left: "50vw",
              }}
              ref={settingsBorderRight}></div>
          </div>
        )}

        <button
          className="relative w-5 h-5"
          onClick={() =>
            setSettingsOpened({
              isOpened: !settingsOpened.isOpened,
              isNeutral: false,
            })
          }>
          <MdOutlineSettings
            className={`text-xl absolute inset-0 transition-all duration-300 ease-in-out ${
              settingsOpened.isOpened
                ? "opacity-0 rotate-90 scale-50"
                : "opacity-100 rotate-0 scale-100"
            }`}
          />
          <MdClose
            className={`text-xl absolute inset-0 transition-all duration-300 ease-in-out ${
              settingsOpened.isOpened
                ? "opacity-100 rotate-0 scale-100"
                : "opacity-0 -rotate-90 scale-50"
            }`}
          />
        </button>
      </div>

      {/* LAPTOP - USER INFO / AUTH */}
      {authState.status ? (
        <div className="hidden lg:flex items-center justify-end gap-4 text-sm lg:text-base font-extralight">
          <div className="h-full flex items-center justify-center">
            <span>welcome,&nbsp;</span>
            <span className="font-bold">{`${authState.username}!`}</span>
          </div>
          {/* <div className="font-thin text-base ">|</div> */}
          <Button
            variant="outline"
            className="hover:bg-zinc-200 text-white border-1 bg-black border-white hover:text-blue-800 transition-all ease-out duration-200"
            onClick={logOut}>
            Log Out
          </Button>
        </div>
      ) : (
        <div className="hidden lg:flex flex items-center justify-end gap-2 text-base font-extralight">
          <Button
            variant="outline"
            className="hover:bg-zinc-200 text-white border-1 bg-black border-white hover:text-blue-800 transition-all ease-out duration-200">
            <CustomLink className="" to="/login" underline={false}>
              Log In
            </CustomLink>
          </Button>
          {/* <div className="">|</div> */}
          <Button
            variant="outline"
            className="hover:bg-zinc-200 text-white border-1 bg-black border-white hover:text-blue-800 transition-all ease-out duration-200">
            <CustomLink className="" to="/register" underline={false}>
              Register
            </CustomLink>
          </Button>
        </div>
      )}
    </div>
  )
}
