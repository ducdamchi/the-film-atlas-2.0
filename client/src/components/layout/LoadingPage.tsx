import { ColorRing } from "react-loader-spinner";

type LoadingPageVariant = "loading" | "authenticating";

const messages: Record<LoadingPageVariant, string> = {
  loading: "Loading...",
  authenticating: "Authenticating...",
};

export default function LoadingPage({
  variant = "loading",
}: {
  variant?: LoadingPageVariant;
}) {
  return (
    <div className="w-[100vw] h-[200vh] top-0 flex flex-col items-center bg-page/40 absolute border-0 z-100 ">
      <div className="absolute top-[25%] w-[15rem] h-auto flex flex-col items-center justify-center p-5 drop-shadow-xl bg-void/80 text-light backdrop-blur-sm border-1 border-dark/50 rounded-md">
        <span className="font-semibold uppercase">{messages[variant]}</span>
        <ColorRing
          colors={[
            "oklch(93% 0.003 48)",
            "oklch(93% 0.003 48)",
            "oklch(93% 0.003 48)",
            "oklch(93% 0.003 48)",
            "oklch(93% 0.003 48)",
          ]}
        />
      </div>
    </div>
  );
}
