import { useMemo } from "react";
import { Link, useRouterState } from "@tanstack/react-router";

export interface CustomLinkProps {
  to: string;
  children: React.ReactNode;
  highlight?: boolean;
  exact?: boolean;
  className?: string;
  onClick?: () => void;
}

export function CustomLink({
  to,
  children,
  highlight = true,
  exact = true,
  ...props
}: CustomLinkProps) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const isActive = exact ? currentPath === to : currentPath.startsWith(to);
  const activeColor = useMemo(() => {
    const colors = ["text-atlas-blue", "text-atlas-green", "text-atlas-pink"];
    return colors[Math.floor(Math.random() * colors.length)];
  }, []);
  return (
    <div className={isActive && highlight ? `${activeColor} font-bold` : ""}>
      <Link to={to} {...props}>
        {children}
      </Link>
    </div>
  );
}
