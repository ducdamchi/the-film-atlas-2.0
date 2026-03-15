import React, { useContext } from "react"
import NavBar from "./Shared/Navigation-Search/NavBar"
import QuickSearchModal from "./Shared/Navigation-Search/QuickSearchModal"
import { GoSquareFill } from "react-icons/go"
import { AuthContext } from "../Utils/authContext"
import { RiProgress8Line, RiProgress4Line } from "react-icons/ri"
import { useNavigate } from "react-router-dom"
import useCommandKey from "../Hooks/useCommandKey"
import { Link } from "react-router-dom"
import { BiLogoGithub } from "react-icons/bi"

export default function Privacy() {
  const navigate = useNavigate()
  const { searchModalOpen, setSearchModalOpen } = useContext(AuthContext)
  function toggleSearchModal() {
    setSearchModalOpen((status) => !status)
  }
  useCommandKey(toggleSearchModal, "k")
  return (
    <div className="font-primary mt-20 mb-20 min-h-screen">
      {searchModalOpen && (
        <QuickSearchModal
          searchModalOpen={searchModalOpen}
          setSearchModalOpen={setSearchModalOpen}
        />
      )}
      <div className="flex flex-col items-center">
        <NavBar />
        <div className="font-heading page-title">PRIVACY POLICY</div>

        <div className="md:p-10 max-w-[40rem] md:text-lg md:max-w-[45rem] flex flex-col gap-0">
          <section className="p-5">
            {/* <div className="landing-sectionTitle">OVERVIEW</div> */}
            <div className="">
              The Film Atlas believes in protecting your privacy while providing
              a valuable service. This policy outlines how we handle information
              when you use our web application.
            </div>
          </section>
          <section className="flex flex-col p-5 gap-2">
            <div className="uppercase inline-block text-lg md:text-xl">
              <span className="inline font-bold">
                INFORMATION WE &nbsp;<span className="underline">DO NOT</span>{" "}
                COLLECT
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex flex-col">
                <div className="mb-2">
                  We do not collect or store any personally identifiable
                  information. Specifically, we do not:
                </div>
                <ul className="ml-2">
                  <li className="">
                    <span>
                      <GoSquareFill className="text-lg inline mb-1" />
                      &nbsp;Collect email addresses
                    </span>
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline" />
                    &nbsp;Request names, addresses, or contact details
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline" />
                    &nbsp;Store payment information (our service is free)
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline" />
                    &nbsp;Use tracking cookies for personal identification
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline" />
                    &nbsp;Create user accounts that require personal data
                  </li>
                </ul>
              </div>
            </div>
          </section>
          <section className="flex flex-col p-5 gap-2">
            <div className="uppercase inline-block text-lg md:text-xl">
              <span className="inline font-bold">
                ANONYMOUS USAGE INFORMATION
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex flex-col">
                <div className="mb-2">
                  When you visit our website, our servers may automatically log:
                </div>
                <ul className="ml-2">
                  <li className="">
                    <span>
                      <GoSquareFill className="text-lg inline mb-1" />
                      &nbsp;Browser type and version
                    </span>
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline" />
                    &nbsp;Device type (mobile, desktop, etc.)
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline" />
                    &nbsp;Search queries for films, directors, or other content
                  </li>
                </ul>
                <div className="mt-2">
                  This information is aggregated and anonymized. We cannot
                  identify individual users from this data.
                </div>
              </div>
            </div>
          </section>
          <section className="flex flex-col p-5 gap-2">
            <div className="uppercase inline-block text-lg md:text-xl">
              <span className="inline font-bold">YOUR FILM-RELATED DATA</span>
            </div>
            <div className="flex flex-col">
              <div className="flex flex-col">
                <div className="mb-2">
                  You may choose to use features such as:
                </div>
                <ul className="ml-2">
                  <li className="">
                    <span>
                      <GoSquareFill className="text-lg inline mb-1" />
                      &nbsp;Add films to lists (watched, watchlist)
                    </span>
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline" />
                    &nbsp;Rate a film
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline" />
                    &nbsp;Look up films and directors
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline" />
                    &nbsp;Discover films through our map
                  </li>
                </ul>
                <div className="mt-2">
                  <span className="font-bold">
                    We do not share this activity data with third parties.
                  </span>{" "}
                  Some of these information are stored locally on your device
                  (in your browser's storage) and remain under your control. You
                  can clear this data at any time by clearing your browser's
                  local storage.
                </div>
              </div>
            </div>
          </section>
          <section className="flex flex-col p-5 gap-2">
            <div className="uppercase inline-block text-lg md:text-xl">
              <span className="inline font-bold">THIRD-PARTY SERVICES</span>
            </div>
            <div className="flex flex-col">
              <div className="flex flex-col">
                <div className="mb-2">We may use:</div>
                <ul className="ml-2">
                  <li className="">
                    <span>
                      <GoSquareFill className="text-lg inline mb-1" />
                      &nbsp;Analytics services (like Google Analytics) to
                      understand overall usage patterns
                    </span>
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline" />
                    &nbsp;Content delivery networks to serve our website
                    efficiently
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline" />
                    &nbsp;Film databases (like TMDB or similar) to provide film
                    information
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline" />
                    &nbsp;Discover films through our map
                  </li>
                </ul>
                <div className="mt-2">
                  These services may collect anonymized data as described above.
                  <span className="font-bold">
                    We do not provide them with any personal information.
                  </span>{" "}
                </div>
              </div>
            </div>
          </section>
          <section className="flex flex-col p-5 gap-2">
            <div className="uppercase inline-block text-lg md:text-xl">
              <span className="inline font-bold">DATA SECURITY</span>
            </div>
            <div className="flex flex-col">
              <div className="flex flex-col">
                <div className="mb-2">
                  While we implement reasonable security measures to protect our
                  systems, please remember that no internet transmission is
                  completely secure. Since we don't collect personal data, the
                  risk associated with using our service is minimal.
                </div>
              </div>
            </div>
          </section>
          <section className="flex flex-col p-5 gap-2">
            <div className="uppercase inline-block text-lg md:text-xl">
              <span className="inline font-bold">THIRD-PARTY SERVICES</span>
            </div>
            <div className="flex flex-col">
              <div className="flex flex-col">
                <div className="mb-2">
                  We respect your privacy and autonomy. In return, we ask that
                  you:
                </div>
                <ul className="ml-2">
                  <li className="">
                    <span>
                      <GoSquareFill className="text-lg inline mb-1" />
                      &nbsp;Use our service lawfully and ethically
                    </span>
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline" />
                    &nbsp;Respect our intellectual property and website
                    infrastructure
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline" />
                    &nbsp;Do not attempt to disrupt or damage our service
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline" />
                    &nbsp;Understand that we provide this service "as is"
                    without warranties
                  </li>
                </ul>
                <div className="mt-2">
                  We reserve the right to block access to any user who violates
                  these principles or engages in harmful activities.
                </div>
              </div>
            </div>
          </section>
          <section className="flex flex-col p-5 gap-2">
            <div className="uppercase inline-block text-lg md:text-xl">
              <span className="inline font-bold">CHANGES TO THIS POLICY</span>
            </div>
            <div className="flex flex-col">
              <div className="flex flex-col">
                <div className="mb-2">
                  We may update this privacy policy periodically. The updated
                  version will be posted on this page with a revised effective
                  date. Continued use of our website constitutes acceptance of
                  the updated policy.
                </div>
              </div>
            </div>
          </section>
          <section className="flex flex-col p-5 gap-2">
            <div className="uppercase inline-block text-lg md:text-xl">
              <span className="inline font-bold">YOUR RIGHTS AND CHOICES</span>
            </div>
            <div className="flex flex-col">
              <div className="flex flex-col">
                <div className="mb-2">
                  Since we don't collect personal data, you don't need to
                  request data deletion or correction. However, you can:
                </div>
                <ul className="ml-2">
                  <li className="">
                    <span>
                      <GoSquareFill className="text-lg inline mb-1" />
                      &nbsp;Clear your browser's local storage to remove any
                      saved browsing status
                    </span>
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline" />
                    &nbsp;Use browser settings to block cookies
                  </li>
                  <li className="">
                    <GoSquareFill className="text-lg inline" />
                    &nbsp;Choose not to use our service at any time
                  </li>
                </ul>
              </div>
            </div>
          </section>
          <section className="flex flex-col p-5 gap-2">
            <div className="uppercase inline-block text-lg md:text-xl">
              <span className="inline font-bold">CONTACT US</span>
            </div>
            <div className="flex flex-col">
              <div className="flex flex-col">
                <div className="mb-2">
                  If you have questions about this privacy policy, please
                  contact us via{" "}
                  <span
                    onClick={() => {
                      navigate("/contact")
                    }}
                    className="text-blue-800 cursor-pointer">
                    this
                  </span>{" "}
                  form.
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
