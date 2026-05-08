import { useRef, useEffect } from "react"
import { useRouterState } from "@tanstack/react-router"
import { usePersistedState } from "@/hooks/usePersistedState"
import { useScreenWidth } from "@/hooks/useScreenWidth"
import { useNavPanelAnimation } from "@/hooks/useNavPanelAnimation"
import { NavBarMobileSection } from "./NavBarMobileSection"
import { NavBarDesktopSection } from "./NavBarDesktopSection"
import { NavBarSettingsPanel } from "./NavBarSettingsPanel"
import type { MenuState } from "./navTypes"

const CLOSED: MenuState = { isOpened: false, isNeutral: true }

// Layout constants (rem)
const navbarHeight = 4.5
const borderWidth = 0.3

export default function NavBar() {
  const [menuOpened, setMenuOpened] = usePersistedState<MenuState>(
    "navbar-menuOpened",
    CLOSED,
  )
  const [settingsOpened, setSettingsOpened] = usePersistedState<MenuState>(
    "navbar-settingsOpened",
    CLOSED,
  )

  const menuRef = useRef<HTMLDivElement>(null)
  const menuBorderBottom = useRef<HTMLDivElement>(null)
  const menuBorderRight = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const settingsBorderBottom = useRef<HTMLDivElement>(null)
  const settingsBorderRight = useRef<HTMLDivElement>(null)

  const screenWidth = useScreenWidth()
  const mobileMenu = screenWidth === null ? null : screenWidth < 1024

  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // Always start with menus closed on mount.
  useEffect(() => {
    setMenuOpened(CLOSED)
    setSettingsOpened(CLOSED)
  }, [])

  // Close menus on route change (handles programmatic navigation that bypasses link onClick).
  useEffect(() => {
    if (menuOpened.isOpened)
      setMenuOpened({ isOpened: false, isNeutral: false })
    if (settingsOpened.isOpened)
      setSettingsOpened({ isOpened: false, isNeutral: false })
  }, [pathname])

  // Close mobile menu when switching to desktop breakpoint.
  useEffect(() => {
    if (screenWidth !== null && screenWidth >= 1024) {
      setMenuOpened(CLOSED)
    }
  }, [screenWidth])

  // Close mobile sub-menus when hamburger closes — handled inside NavBarMobileSection
  // via the menuOpened prop passed down.

  useNavPanelAnimation(
    menuOpened,
    setMenuOpened,
    menuRef,
    menuBorderBottom,
    menuBorderRight,
    -500,
    -400,
    navbarHeight,
  )

  useNavPanelAnimation(
    settingsOpened,
    setSettingsOpened,
    settingsRef,
    settingsBorderBottom,
    settingsBorderRight,
    500,
    -350,
    navbarHeight,
  )

  const settingsPanelWidth =
    screenWidth !== null && screenWidth >= 400
      ? "200px"
      : `calc(50vw - ${borderWidth}rem)`

  return (
    <div
      className="fixed top-0 left-0 font-primary flex items-center justify-between w-screen p-0 md:p-3 md:pl-[2rem] md:pr-[2rem] bg-background text-light border-atlas-blue z-400"
      style={{ height: `${navbarHeight}rem` }}>
      {/* LEFT SIDE */}
      <div className="flex items-center justify-center gap-3 lg:gap-5 min-w-[12rem] ml-4">
        {mobileMenu && (
          <NavBarMobileSection
            menuOpened={menuOpened}
            setMenuOpened={setMenuOpened}
            setSettingsOpened={setSettingsOpened}
            menuRef={menuRef}
            menuBorderBottom={menuBorderBottom}
            menuBorderRight={menuBorderRight}
            settingsPanelWidth={settingsPanelWidth}
            navbarHeight={navbarHeight}
            borderWidth={borderWidth}
          />
        )}
        <NavBarDesktopSection />
      </div>

      {/* RIGHT SIDE */}
      <NavBarSettingsPanel
        settingsOpened={settingsOpened}
        setSettingsOpened={setSettingsOpened}
        settingsRef={settingsRef}
        settingsBorderBottom={settingsBorderBottom}
        settingsBorderRight={settingsBorderRight}
        settingsPanelWidth={settingsPanelWidth}
        navbarHeight={navbarHeight}
        borderWidth={borderWidth}
      />
    </div>
  )
}
