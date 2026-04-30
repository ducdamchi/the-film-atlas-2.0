import { createFileRoute, redirect } from "@tanstack/react-router";
import Directors from "../components/Directors";

export const Route = createFileRoute("/directors")({
  ssr: false,
  // beforeLoad: ({ context }) => {
  //   if (!context.auth) throw redirect({ to: "/login" });
  // },
  component: Directors,
});
