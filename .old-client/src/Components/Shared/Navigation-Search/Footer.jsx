import React from "react"
import { FaGithub } from "react-icons/fa"
import { useNavigate } from "react-router-dom"

// export default function Footer() {
//   return (
//     <div className="fixed bottom-0 font-logo w-screen h-auto text-[7px] font-thin flex justify-end w-screen bg-white">
//       <div className="flex items-center p-2 pr-3">
//         DEVELOPED BY &#169; DUC DAM 2025
//       </div>
//     </div>
//   )
// }

// import { Typography } from "@material-tailwind/react"

const LINKS = [
  {
    title: "Features",
    items: [
      { name: "Map", link: "/map" },
      { name: "Films", link: "/films" },
      { name: "Directors", link: "/directors" },
    ],
  },
  {
    title: "Info",
    items: [
      { name: "About", link: "/about" },
      { name: "Contact", link: "/contact" },
      { name: "Docs", link: "/docs" },
    ],
  },
  {
    title: "Legal",
    items: [
      { name: "Privacy Policy", link: "/privacy" },
      { name: "Terms & Conditions", link: "/terms" },
    ],
  },
]

const currentYear = new Date().getFullYear()

export default function FooterWithSocialLinks() {
  const navigate = useNavigate()

  return (
    <footer className="relative w-full bg-black text-stone-200 p-10 font-primary z-100">
      <div className="mx-auto w-full max-w-7xl px-8">
        <div className="grid grid-cols-1 justify-between gap-4 md:grid-cols-2">
          <div className="mb-6 flex flex-col items-start">
            <div className="font-logo uppercase text-2xl">The Film Atlas</div>
            <div>Discover & curate World Cinema.</div>
          </div>
          <div className="grid grid-cols-3 justify-between gap-4">
            {LINKS.map(({ title, items }) => (
              <ul key={title}>
                <div
                  variant="small"
                  color="blue-gray"
                  className="mb-3 font-medium opacity-50">
                  {title}
                </div>
                {items.map((link) => (
                  <li key={link.name}>
                    <div
                      onClick={() => navigate(link.link)}
                      className="py-1.5 font-normal transition-colors hover:text-blue-gray-900 cursor-pointer hover:underline">
                      {link.name}
                    </div>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
        <div className="mt-12 flex w-full flex-col items-center justify-center border-t border-blue-gray-50 py-4 md:flex-row md:justify-between">
          <div
            variant="small"
            className="mb-4 text-center font-normal text-blue-gray-900 md:mb-0">
            &copy; {currentYear}{" "}
            <a href="https://material-tailwind.com/">The Film Atlas</a>
          </div>
          <div className="flex gap-4 text-blue-gray-900 sm:justify-center">
            <a
              as="a"
              href="https://github.com/ducdamchi/the-film-atlas"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-80 transition-opacity hover:opacity-100">
              <FaGithub className="text-2xl" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
