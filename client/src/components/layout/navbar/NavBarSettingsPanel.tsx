import { type RefObject } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MdOutlineSettings, MdClose } from "react-icons/md";
import { useAuth } from "@/utils/authContext";
import { clearAllPersistedState } from "@/utils/localStorage";
import { CustomLink } from "./CustomLink";
import type { MenuState } from "./navTypes";

interface NavBarSettingsPanelProps {
  settingsOpened: MenuState;
  setSettingsOpened: (state: MenuState) => void;
  settingsRef: RefObject<HTMLDivElement | null>;
  settingsBorderBottom: RefObject<HTMLDivElement | null>;
  settingsBorderRight: RefObject<HTMLDivElement | null>;
  settingsPanelWidth: string;
  navbarHeight: number;
  borderWidth: number;
}

const CLOSED: MenuState = { isOpened: false, isNeutral: true };

export function NavBarSettingsPanel({
  settingsOpened,
  setSettingsOpened,
  settingsRef,
  settingsBorderBottom,
  settingsBorderRight,
  settingsPanelWidth,
  navbarHeight,
  borderWidth,
}: NavBarSettingsPanelProps) {
  const { authState, setAuthState } = useAuth();
  const navigate = useNavigate();

  const logOut = () => {
    clearAllPersistedState();
    setAuthState({ username: "", id: 0, status: false });
    navigate({ to: "/login" });
  };

  return (
    <div className="flex items-center justify-end gap-1 mr-4 text-sm z-100">
      {authState.status ? (
        <>
          <div>
            <div className="h-full flex items-center justify-center">
              <span className="p-1 flex items-center justify-center font-light">
                {authState.username}
              </span>
            </div>

            {/* Settings slide panel */}
            <div
              className="hidden absolute z-20 right-0 bg-black border-atlas-blue pl-5 pb-5 pt-2 transition-all ease-out duration-200 font-light justify-end items-center"
              style={{
                top: `${navbarHeight}rem`,
                width: settingsPanelWidth,
              }}
              ref={settingsRef}
            >
              <ul className="flex flex-col text-right mr-5 md:mr-10 gap-0 uppercase w-full">
                <div>
                  <div className="border-b-1 p-3 flex flex-col items-end justify-center gap-1.5">
                    <button className="uppercase" onClick={logOut}>
                      log out
                    </button>
                  </div>
                  <div className="p-3 flex flex-col items-end justify-center gap-1.5">
                    <CustomLink to="/settings" onClick={() => setSettingsOpened(CLOSED)}>
                      settings
                    </CustomLink>
                  </div>
                </div>
              </ul>
            </div>

            {/* Decorative borders */}
            <div
              className="hidden absolute right-0 bg-atlas-green z-20 transition-all ease-out duration-400"
              style={{
                width: `calc(${settingsPanelWidth} + ${borderWidth}rem)`,
                height: `${borderWidth}rem`,
              }}
              ref={settingsBorderBottom}
            />
            <div
              className="hidden absolute bg-atlas-pink z-20 transition-all ease-out duration-400"
              style={{
                width: `${borderWidth}rem`,
                top: `${navbarHeight}rem`,
                left: `calc(100vw - ${settingsPanelWidth} - ${borderWidth}rem)`,
              }}
              ref={settingsBorderRight}
            />
          </div>

          <button
            className="relative w-5 h-5"
            onClick={() =>
              setSettingsOpened({
                isOpened: !settingsOpened.isOpened,
                isNeutral: false,
              })
            }
          >
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
        </>
      ) : (
        <>
          <div className="h-full flex items-center justify-center">
            <button className="border-primary-foreground border-1 text-primary-foreground p-2 rounded-none w-[5rem] hover:bg-primary/70 transition-all duration-200 ease-out">
              <CustomLink to="/register" highlight={false}>
                Register
              </CustomLink>
            </button>
          </div>
          <div className="h-full flex items-center justify-center">
            <button className="bg-primary-foreground hover:bg-primary-foreground/90 transition-all duration-200 ease-out text-primary p-2 rounded-none w-[5rem]">
              <CustomLink to="/login" highlight={false}>
                Login
              </CustomLink>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
