export interface MenuState {
  isOpened: boolean;
  isNeutral: boolean;
}

export const INFO_LINKS = [
  { to: "/about", label: "ABOUT" },
  { to: "/contact", label: "CONTACT" },
  { to: "/docs", label: "DOCS" },
] as const;
