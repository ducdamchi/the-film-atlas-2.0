import { ColorRing } from "react-loader-spinner"

export default function LoadingPage() {
  return (
    <div className="w-[100vw] h-[200vh] top-0 flex flex-col items-center bg-page/30 absolute border-0 z-100">
      <div className="absolute top-[25%] bg-page w-[15rem] h-auto flex flex-col items-center justify-center rounded-none p-5 drop-shadow-xl">
        <span className="font-semibold uppercase text-dark">
          Loading...
        </span>
        <ColorRing colors={["#000000"]} />
      </div>
    </div>
  )
}
