export default function AuthBg() {
  return (
    <>
      <div className="hidden lg:flex z-0 top-0 h-screen overflow-hidden flex flex-row gap-0 scale-200">
        <img
          loading="lazy"
          src="worldmap.svg"
          alt=""
          className="scale-100 z-0 border-blue-500 animate-[moveHorizontal_30s_linear_infinite] bg-foreground"
        />
        <img
          loading="lazy"
          src="worldmap.svg"
          alt=""
          className="scale-100 z-0 border-blue-500 animate-[moveHorizontal_30s_linear_infinite] bg-foreground"
        />
      </div>

      {/* <div className="lg:hidden fixed z-0 top-0 h-screen w-screen bg-background">
        <img loading="lazy"
          src="worldmap.svg"
          alt=""
          className="border-1 w-full h-full object-cover"
        />
      </div> */}
    </>
  )
}
