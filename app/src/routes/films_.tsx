import { createFileRoute, redirect } from "@tanstack/react-router";
import Films from "../components/Films";

export const Route = createFileRoute("/films_")({
  ssr: false,
  // beforeLoad: ({ context }) => {
  //   if (!context.auth) throw redirect({ to: "/login" });
  // },
  component: Films,
});
