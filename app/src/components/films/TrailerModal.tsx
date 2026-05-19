import ReactDom from "react-dom"
import { MdClose } from "react-icons/md"

interface TrailerModalProps {
  trailerLink: string
  closeModal: () => void
}

export default function TrailerModal({
  trailerLink,
  closeModal,
}: TrailerModalProps) {
  const portalTarget = document.getElementById("trailerModal")
  if (!portalTarget) return null

  return ReactDom.createPortal(
    <>
      <div className="fixed top-0 left-0 w-screen h-screen bg-black/60 flex items-center justify-center z-50">
        <div className="w-[90%] aspect-16/9 max-w-[30rem] md:max-w-[40rem] lg:max-w-[50rem] xl:lg:max-w-[60rem] 2xl:max-w-[70rem] flex flex-col items-center justify-center gap-2">
          <div
            className="w-full flex justify-end text-background"
            onClick={closeModal}>
            <MdClose className="text-xl md:text-3xl xl:text-5xl hover:bg-accent-foreground/70 transition-all duration-300 ease-in" />
          </div>
          <div className="w-full h-full">
            <iframe
              className=""
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${trailerLink}?autoplay=1&mute=0&playsinline=1`}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen></iframe>
          </div>
        </div>
      </div>
    </>,
    portalTarget,
  )
}
