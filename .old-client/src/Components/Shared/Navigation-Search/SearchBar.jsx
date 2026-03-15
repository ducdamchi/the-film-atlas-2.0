import React from "react"
import { BiSearchAlt2 } from "react-icons/bi"
import { MdClose } from "react-icons/md"

export default function SearchBar({
  searchInput,
  setSearchInput,
  placeholderString,
}) {
  return (
    <>
      <div className="flex flex-col items-center justify-center gap-2 mt-10 w-full h-auto">
        <div className="relative w-[50%] min-w-[20rem] max-w-[30rem] border-2 h-[2.5rem] p-2 lg:p-3 flex items-center gap-2 drop-shadow-xl border-1 rounded-full drop-shadow-sm/50 drop-shadow-black/40">
          <BiSearchAlt2 className="ml-2 lg:mt-[2px]" />
          <input
            className="h-[2.5rem] w-full border-0 focus:outline-0 input:bg-none text-base lg:text-lg"
            type="text"
            name="search-bar"
            autoComplete="off"
            placeholder={placeholderString}
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setSearchInput(event.target.value)
              }
            }}></input>
          {searchInput && searchInput !== "" && (
            <MdClose
              className="mr-1 text-2xl hover:bg-gray-100 transition-all ease-out duration-200 rounded-md"
              onClick={() => setSearchInput("")}
            />
          )}
        </div>
        {searchInput && searchInput !== "" && (
          <div className="pt-1 italic text-black/80 font-light">
            <span
              className="cursor-pointer hover:text-blue-800 transition-all ease-out duration-200 underline"
              onClick={() => setSearchInput("")}>
              Clear
            </span>{" "}
            search to return to list.
          </div>
        )}
      </div>
    </>
  )
}
