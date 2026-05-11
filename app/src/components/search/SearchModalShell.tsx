import type { RefObject } from "react"
import { BiSearchAlt2 } from "react-icons/bi"

interface SearchModalShellProps {
  inputRef: RefObject<HTMLInputElement | null>
  modalRef: RefObject<HTMLElement | null>
  searchInput: string
  onSearchChange: (value: string) => void
  onClose: () => void
  placeholder: string
  header?: React.ReactNode
  onEnter?: (value: string) => void
  children?: React.ReactNode
}

export default function SearchModalShell({
  inputRef,
  modalRef,
  searchInput,
  onSearchChange,
  onClose,
  placeholder,
  header,
  onEnter,
  children,
}: SearchModalShellProps) {
  return (
    <div className="font-primary fixed top-[20%] left-0 w-screen h-auto z-500 flex justify-center">
      <div
        className="relative w-[60%] h-auto min-w-[20rem] max-w-[32rem] bg-foreground/80 text-background text-light backdrop-blur-sm border-1  /50 rounded-md"
        ref={modalRef as RefObject<HTMLDivElement>}>
        {header}

        {/* Search bar */}
        <div className="relative flex justify-start h-auto  /50">
          <div className="relative w-full min-w-[10rem] h-[2.5rem] md:h-[3rem] xl:h-[3.5rem] p-2 flex items-center gap-3">
            <BiSearchAlt2 className="border-light ml-1 text-lg md:text-xl" />
            <input
              ref={inputRef}
              className="h-[4rem] w-full border-light focus:outline-0 input:bg-none text-base lg:text-lg"
              type="text"
              autoComplete="off"
              placeholder={placeholder}
              value={searchInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onSearchChange(e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") onEnter?.(e.currentTarget.value)
              }}
            />
            <button
              className="border-1 p-[3px] md:pb-1 md:pl-2 md:pr-2 rounded-md text-[12px] md:text-sm xl:text-base"
              onClick={onClose}>
              esc
            </button>
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}
