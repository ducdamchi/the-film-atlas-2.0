import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BiSearchAlt2 } from "react-icons/bi";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/utils/authContext";
import { CustomLink } from "./CustomLink";
import { INFO_LINKS } from "./navTypes";

export function NavBarDesktopSection() {
  const navigate = useNavigate();
  const { setSearchModalOpen } = useAuth();
  const [infoDropdownOpen, setInfoDropdownOpen] = useState(false);
  const infoDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (infoDropdownRef.current && !infoDropdownRef.current.contains(e.target as Node)) {
        setInfoDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {/* LAPTOP - APP NAME */}
      <div className="hidden lg:flex h-full items-center justify-center">
        <span
          onClick={() => navigate({ to: "/about" })}
          className="font-logo font-black uppercase text-lg lg:text-xl cursor-pointer"
        >
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
              onClick={() => setInfoDropdownOpen((prev) => !prev)}
            >
              INFO
              <ChevronDown
                className={`w-3 h-3 transition-transform duration-200 ${infoDropdownOpen ? "rotate-180" : "rotate-0"}`}
              />
            </button>
            <div
              className={`absolute top-full left-0 mt-2 bg-black border border-stone-600 flex flex-col min-w-[8rem] z-500 overflow-hidden transition-all duration-200 ease-out ${infoDropdownOpen ? "max-h-40 opacity-100 p-3 gap-2" : "max-h-0 opacity-0 p-0 gap-0"}`}
            >
              {INFO_LINKS.map(({ to, label }) => (
                <CustomLink
                  key={to}
                  to={to}
                  exact={false}
                  onClick={() => setInfoDropdownOpen(false)}
                >
                  {label}
                </CustomLink>
              ))}
            </div>
          </div>
        </ul>
        <button
          className="flex items-center justify-center gap-1 border-0 p-1 pl-2 pr-2 rounded-full bg-stone-200 text-gray-600 cursor-pointer"
          onClick={() => setSearchModalOpen(true)}
        >
          <BiSearchAlt2 />
          {`\u2318K`}
        </button>
      </div>
    </>
  );
}
