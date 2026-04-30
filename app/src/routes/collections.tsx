import { createFileRoute, redirect } from "@tanstack/react-router";
import Collections from "../components/Collections";

export const Route = createFileRoute("/collections")({
  ssr: false,
  // beforeLoad: ({ context }) => {
  //   if (!context.auth) throw redirect({ to: "/login" });
  // },
  component: Collections,
});
