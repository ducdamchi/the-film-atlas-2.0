import React from "react"
import ReactDom from "react-dom"
import { ColorRing } from "react-loader-spinner"

export default function LoadingPage() {
  return ReactDom.createPortal(
    <>
      <div className="w-[100vw] h-[200vh] top-0 flex flex-col items-center bg-zinc-100/30 absolute border-0 border-black z-100">
        <div className="absolute top-[25%] bg-zinc-100 w-[15rem] h-auto flex flex-col items-center justify-center rounded-none p-5 drop-shadow-xl">
          <span className="font-semibold uppercase text-zinc-800">
            Loading...
          </span>
          <ColorRing colors={["#000000"]} />
        </div>
      </div>
    </>,
    document.getElementById("loadingPage")
  )
}

// colors={["#000000", "#404040", "#bfbfbf", "#404040", "#000000"]}
