import { useState, useEffect, type RefObject } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MdMenu, MdClose } from "react-icons/md";
import { BiSearchAlt2 } from "react-icons/bi";
import { ChevronDown } from "lucide-react";
import { useApp } from "@/utils/appContext";
import { CustomLink } from "./CustomLink";
import { INFO_LINKS, type MenuState } from "./navTypes";
import { IoIosMenu, IoIosCloseCircle } from "react-icons/io";

interface NavBarMobileSectionProps {
  menuOpened: MenuState;
  setMenuOpened: (state: MenuState) => void;
  setSettingsOpened: (state: MenuState) => void;
  menuRef: RefObject<HTMLDivElement | null>;
  menuBorderBottom: RefObject<HTMLDivElement | null>;
  menuBorderRight: RefObject<HTMLDivElement | null>;
  settingsPanelWidth: string;
  navbarHeight: number;
  borderWidth: number;
}

export function NavBarMobileSection({
  menuOpened,
  setMenuOpened,
  setSettingsOpened,
  menuRef,
  menuBorderBottom,
  menuBorderRight,
  settingsPanelWidth,
  navbarHeight,
  borderWidth,
}: NavBarMobileSectionProps) {
  const navigate = useNavigate();
  const { setSearchModalOpen } = useApp();
  const [mobileInfoDropdownOpen, setMobileInfoDropdownOpen] = useState(false);

  const closeAll = () => {
    setMenuOpened({ isOpened: false, isNeutral: false });
    setSettingsOpened({ isOpened: false, isNeutral: false });
  };

  // ResizeObserver lives here (not in the hook) because NavBarMobileSection is
  // conditionally rendered — menuRef.current is null when the hook's effect runs on mount.
  // Running the observer here guarantees the ref is attached when the effect fires.
  useEffect(() => {
    const panel = menuRef.current;
    if (!panel) return;

    const ro = new ResizeObserver(() => {
      if (
        !menuRef.current ||
        !menuBorderBottom.current ||
        !menuBorderRight.current
      )
        return;
      if (menuRef.current.style.display === "none") return;

      const panelHeightPx = menuRef.current.offsetHeight;
      const rootFontSize = parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );
      const navbarHeightPx = navbarHeight * rootFontSize;

      menuBorderBottom.current.style.top = `${navbarHeightPx + panelHeightPx}px`;
      menuBorderRight.current.style.height = `${panelHeightPx}px`;
    });

    ro.observe(panel);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      {/* MOBILE - APP NAME + HAMBURGER + SEARCH */}
      <div className="lg:hidden h-full flex items-center justify-center pt-0 z-30">
        <button
          className="mr-2 relative w-5 h-5"
          onClick={() =>
            setMenuOpened({
              isOpened: !menuOpened.isOpened,
              isNeutral: false,
            })
          }
        >
          <IoIosMenu
            className={`text-xl absolute inset-0 transition-all duration-300 ease-in-out ${
              menuOpened.isOpened
                ? "opacity-0 rotate-90 scale-50"
                : "opacity-100 rotate-0 scale-100"
            }`}
          />
          <IoIosCloseCircle
            className={`text-xl absolute inset-0 transition-all duration-300 ease-in-out ${
              menuOpened.isOpened
                ? "opacity-100 rotate-0 scale-100"
                : "opacity-0 -rotate-90 scale-50"
            }`}
          />
        </button>
        <span
          onClick={() => navigate({ to: "/about" })}
          className="font-logo text-base uppercase font-black flex items-center justify-center p-1 cursor-pointer"
        >
          The Film Atlas
        </span>
        <button
          className="flex items-center justify-center ml-2 p-[5px] pl-[10px] pr-[10px] rounded-full bg-control text-dark cursor-pointer"
          onClick={() => setSearchModalOpen(true)}
        >
          <BiSearchAlt2 className="text-[10px]" />
        </button>
      </div>

      {/* MOBILE - SLIDE PANEL */}
      <div
        className="hidden absolute z-20 left-0 bg-void border-atlas-blue pl-5 pb-5 pt- transition-all ease-out duration-200 font-light z-100 md:pl-12"
        style={{
          width: settingsPanelWidth,
          top: `${navbarHeight}rem`,
        }}
        ref={menuRef}
      >
        <ul className="flex flex-col gap-2 text-sm">
          <CustomLink to="/map" exact={false} onClick={closeAll}>
            MAP
          </CustomLink>
          <CustomLink to="/films" exact={false} onClick={closeAll}>
            FILMS
          </CustomLink>
          <CustomLink to="/directors" exact={false} onClick={closeAll}>
            DIRECTORS
          </CustomLink>
          <CustomLink to="/collections" exact={false} onClick={closeAll}>
            COLLECTIONS
          </CustomLink>
          <div>
            <button
              className="flex items-center gap-1 uppercase"
              onClick={() => setMobileInfoDropdownOpen((prev) => !prev)}
            >
              INFO
              <ChevronDown
                className={`w-3 h-3 transition-transform duration-200 ${mobileInfoDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
            <div
              className={`overflow-hidden transition-[max-height] duration-200 ease-out ${mobileInfoDropdownOpen ? "max-h-40" : "max-h-0"}`}
            >
              <ul className="flex flex-col gap-2 pl-3 pt-2">
                {INFO_LINKS.map(({ to, label }) => (
                  <CustomLink
                    key={to}
                    to={to}
                    exact={false}
                    onClick={() => {
                      closeAll();
                      setMobileInfoDropdownOpen(false);
                    }}
                  >
                    {label}
                  </CustomLink>
                ))}
              </ul>
            </div>
          </div>
        </ul>
      </div>

      {/* MOBILE - DECORATIVE BORDERS */}
      {/* transition is transform-only: top/height are updated programmatically and must track instantly */}
      <div
        className="hidden absolute left-0 bg-atlas-green z-20"
        style={{
          height: `${borderWidth}rem`,
          width: `calc(${settingsPanelWidth} + ${borderWidth}rem)`,
          transition: "transform 0.4s ease-out",
        }}
        ref={menuBorderBottom}
      />
      <div
        className="hidden absolute bg-atlas-pink z-20"
        style={{
          width: `${borderWidth}rem`,
          top: `${navbarHeight}rem`,
          left: settingsPanelWidth,
          transition: "transform 0.4s ease-out",
        }}
        ref={menuBorderRight}
      />
    </>
  );
}
