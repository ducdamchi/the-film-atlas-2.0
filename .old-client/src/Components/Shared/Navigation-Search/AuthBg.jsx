import React from "react"

export default function AuthBg() {
  return (
    <>
      <div className="hidden lg:flex auth-svgContainer">
        <img src="worldmap.svg" alt="" className="auth-svg" />
        <img src="worldmap.svg" alt="" className="auth-svg" />
      </div>

      <div className="lg:hidden fixed z-0 top-0 h-screen w-screen bg-black">
        <img
          src="worldmap.svg"
          alt=""
          className="border-1 w-full h-full object-cover"
        />
      </div>
    </>
  )
}
