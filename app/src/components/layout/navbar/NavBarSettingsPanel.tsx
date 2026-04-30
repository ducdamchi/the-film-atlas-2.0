import { type RefObject } from "react";
import { useNavigate, ClientOnly } from "@tanstack/react-router";
import { MdOutlineSettings, MdClose } from "react-icons/md";
import { useAuth } from "@/utils/authContext";
import { clearAllPersistedState } from "@/utils/localStorage";
import { CustomLink } from "./CustomLink";
import type { MenuState } from "./navTypes";
import { IoIosSettings, IoIosCloseCircle } from "react-icons/io";

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

  const loginButton = (
    <div className="h-full flex items-center justify-center">
      <button className="text-dark bg-elevated hover:bg-elevated/90 transition-all duration-200 ease-out text-body p-2 px-3 rounded-full w-[5rem]">
        <CustomLink to="/login" highlight={false}>
          Login
        </CustomLink>
      </button>
    </div>
  );

  return (
    <div className="flex items-center justify-end gap-1 mr-4 text-sm z-100">
      <ClientOnly fallback={loginButton}>
      {authState.status ? (
        <>
          <div>
            <div className="h-full flex items-center justify-center">
              <span className="p-1 flex items-center justify-center font-extrabold text-sm lg:text-base">
                {authState.username}
              </span>
            </div>

            {/* Settings slide panel */}
            <div
              className="hidden absolute z-20 right-0 bg-void border-atlas-blue pl-5 pb-5 pt-2 transition-all ease-out duration-200 font-light justify-end items-center"
              style={{
                top: `${navbarHeight}rem`,
                width: settingsPanelWidth,
              }}
              ref={settingsRef}
            >
              <ul className="flex flex-col items-end justify-center text-sm lg:text-base mr-5 md:mr-10 gap-2 w-full">
                <button className="" onClick={logOut}>
                  Log Out
                </button>

                <CustomLink
                  className=""
                  to="/settings"
                  onClick={() => setSettingsOpened({ isOpened: false, isNeutral: false })}
                >
                  Settings
                </CustomLink>
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
            <IoIosSettings
              className={`text-xl absolute inset-0 transition-all duration-300 ease-in-out ${
                settingsOpened.isOpened
                  ? "opacity-0 rotate-90 scale-50"
                  : "opacity-100 rotate-0 scale-100"
              }`}
            />
            <IoIosCloseCircle
              className={`text-xl absolute inset-0 transition-all duration-300 ease-in-out ${
                settingsOpened.isOpened
                  ? "opacity-100 rotate-0 scale-100"
                  : "opacity-0 -rotate-90 scale-50"
              }`}
            />
          </button>
        </>
      ) : (
        loginButton
      )}
      </ClientOnly>
    </div>
  );
}
