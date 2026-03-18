import { useState, type RefObject } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MdMenu, MdClose } from "react-icons/md";
import { BiSearchAlt2 } from "react-icons/bi";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/utils/authContext";
import { CustomLink } from "./CustomLink";
import { INFO_LINKS, type MenuState } from "./navTypes";

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

const CLOSED: MenuState = { isOpened: false, isNeutral: true };

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
  const { setSearchModalOpen } = useAuth();
  const [mobileInfoDropdownOpen, setMobileInfoDropdownOpen] = useState(false);

  const closeAll = () => {
    setMenuOpened(CLOSED);
    setSettingsOpened(CLOSED);
  };

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
          onClick={() => navigate({ to: "/about" })}
          className="font-logo text-base uppercase font-black flex items-center justify-center p-1 cursor-pointer"
        >
          The Film Atlas
        </span>
        <button
          className="flex items-center justify-center ml-2 p-[5px] pl-[10px] pr-[10px] rounded-full bg-stone-200 text-stone-900 cursor-pointer"
          onClick={() => setSearchModalOpen(true)}
        >
          <BiSearchAlt2 className="text-[10px]" />
        </button>
      </div>

      {/* MOBILE - SLIDE PANEL */}
      <div
        className="hidden absolute z-20 left-0 bg-black border-atlas-blue pl-5 pb-5 pt- transition-all ease-out duration-200 font-light z-100 md:pl-12"
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
            {mobileInfoDropdownOpen && (
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
            )}
          </div>
        </ul>
      </div>

      {/* MOBILE - DECORATIVE BORDERS */}
      <div
        className="hidden absolute left-0 bg-atlas-green z-20 transition-all ease-out duration-400"
        style={{
          height: `${borderWidth}rem`,
          width: `calc(${settingsPanelWidth} + ${borderWidth}rem)`,
        }}
        ref={menuBorderBottom}
      />
      <div
        className="hidden absolute bg-atlas-pink z-20 transition-all ease-out duration-400"
        style={{
          width: `${borderWidth}rem`,
          top: `${navbarHeight}rem`,
          left: settingsPanelWidth,
        }}
        ref={menuBorderRight}
      />
    </>
  );
}
