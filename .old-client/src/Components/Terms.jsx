import React, { useContext } from "react"
import NavBar from "./Shared/Navigation-Search/NavBar"
import QuickSearchModal from "./Shared/Navigation-Search/QuickSearchModal"
import { GoSquareFill } from "react-icons/go"
import { AuthContext } from "../Utils/authContext"
import { useNavigate } from "react-router-dom"
import useCommandKey from "../Hooks/useCommandKey"

export default function Terms() {
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
        <div className="font-heading page-title">TERMS AND CONDITIONS</div>

        <div className="md:p-10 max-w-[40rem] md:text-lg md:max-w-[45rem] flex flex-col gap-0">
          <section className="p-5">
            <div className="text-sm text-gray-500 mb-4">
              Last Updated: January 14, 2026
            </div>
            <div className="">
              Welcome to The Film Atlas (the "Website"). By accessing or using
              our Website, you agree to be bound by these Terms and Conditions
              ("Terms"). If you do not agree to these Terms, please do not use
              our Website.
            </div>
          </section>

          <section className="flex flex-col p-5 gap-2">
            <div className="uppercase inline-block text-lg md:text-xl">
              <span className="inline font-bold">1. USE OF THE WEBSITE</span>
            </div>
            <div className="flex flex-col">
              <div className="mb-2">
                The Website provides a free service to look up film information,
                create personal lists (such as watched films and watchlists),
                and explore cinema-related content.
              </div>
              <div>
                You agree to use the Website only for lawful purposes and in a
                way that does not infringe the rights of, restrict, or inhibit
                anyone else's use of the Website.
              </div>
            </div>
          </section>

          <section className="flex flex-col p-5 gap-2">
            <div className="uppercase inline-block text-lg md:text-xl">
              <span className="inline font-bold">2. USER RESPONSIBILITIES</span>
            </div>
            <div className="flex flex-col">
              <div className="mb-2">You are solely responsible for:</div>
              <ul className="ml-2">
                <li className="">
                  <GoSquareFill className="text-lg inline mb-1" />
                  &nbsp;Any activity that occurs through your device or browser
                  session.
                </li>
                <li className="">
                  <GoSquareFill className="text-lg inline" />
                  &nbsp;Maintaining the confidentiality of any locally stored
                  data on your own device.
                </li>
                <li className="">
                  <GoSquareFill className="text-lg inline" />
                  &nbsp;Using the Website in compliance with all applicable
                  local, national, and international laws and regulations.
                </li>
              </ul>
            </div>
          </section>

          <section className="flex flex-col p-5 gap-2">
            <div className="uppercase inline-block text-lg md:text-xl">
              <span className="inline font-bold">3. INTELLECTUAL PROPERTY</span>
            </div>
            <div className="flex flex-col">
              <div className="mb-2">
                <span className="font-bold">Our Content:</span> All content
                provided by the Website (including logos, design, text, and
                original compilation of data) is our intellectual property or
                licensed to us and is protected by copyright and other laws.
              </div>
              <div className="mb-2">
                <span className="font-bold">Film Data:</span> Film information,
                images, posters, and metadata are provided by third-party
                databases (e.g., TMDb) and are subject to their respective
                licenses and terms. We do not claim ownership over this
                third-party content.
              </div>
              <div>
                <span className="font-bold">Your Content:</span> Any ratings,
                reviews, or lists you create are stored anonymously on our
                server. Additional information on your user session may be
                stored on your browser's local storage for a seamless user
                experience (e.g., scroll restoration, view mode persistence,
                etc.). You may remove this data anytime by clearing your
                browser's local storage. By creating these data on our platform,
                you grant us a non-exclusive, royalty-free license to store and
                display that content solely in connection with your use of the
                Website.
              </div>
            </div>
          </section>

          <section className="flex flex-col p-5 gap-2">
            <div className="uppercase inline-block text-lg md:text-xl">
              <span className="inline font-bold">
                4. DISCLAIMER OF WARRANTIES
              </span>
            </div>
            <div className="flex flex-col">
              <div>
                The Website and its content are provided on an "AS IS" and "AS
                AVAILABLE" basis. We make no warranties, expressed or implied,
                regarding the accuracy, completeness, reliability, or
                availability of the service. We do not guarantee that the
                Website will be uninterrupted, error-free, or free from viruses
                or other harmful components.
              </div>
            </div>
          </section>

          <section className="flex flex-col p-5 gap-2">
            <div className="uppercase inline-block text-lg md:text-xl">
              <span className="inline font-bold">
                5. LIMITATION OF LIABILITY
              </span>
            </div>
            <div className="flex flex-col">
              <div>
                To the fullest extent permitted by law, we shall not be liable
                for any direct, indirect, incidental, special, consequential, or
                punitive damages resulting from your use or inability to use the
                Website, including loss of data stored locally in your browser.
              </div>
            </div>
          </section>

          <section className="flex flex-col p-5 gap-2">
            <div className="uppercase inline-block text-lg md:text-xl">
              <span className="inline font-bold">
                6. SERVICE MODIFICATIONS AND TERMINATION
              </span>
            </div>
            <div className="flex flex-col">
              <div className="mb-2">We reserve the right to:</div>
              <ul className="ml-2">
                <li className="">
                  <GoSquareFill className="text-lg inline mb-1" />
                  &nbsp;Modify, suspend, or discontinue any part of the Website
                  at any time, with or without notice.
                </li>
                <li className="">
                  <GoSquareFill className="text-lg inline" />
                  &nbsp;Update these Terms at any time. Continued use after
                  changes constitutes acceptance.
                </li>
                <li className="">
                  <GoSquareFill className="text-lg inline" />
                  &nbsp;Block or restrict access to any user who violates these
                  Terms or engages in harmful conduct (e.g., attempting to
                  scrape our database, disrupt the service, or engage in illegal
                  activities).
                </li>
              </ul>
            </div>
          </section>

          <section className="flex flex-col p-5 gap-2">
            <div className="uppercase inline-block text-lg md:text-xl">
              <span className="inline font-bold">7. DATA AND PRIVACY</span>
            </div>
            <div className="flex flex-col">
              <div className="mb-2">
                Your privacy is important to us. Please review our separate{" "}
                <span
                  onClick={() => navigate("/privacy")}
                  className="text-blue-800 cursor-pointer">
                  Privacy Policy
                </span>{" "}
                for details on how we handle information. In short:
              </div>
              <ul className="ml-2">
                <li className="">
                  <GoSquareFill className="text-lg inline mb-1" />
                  &nbsp;We do not collect personal information like emails.
                </li>
                <li className="">
                  <GoSquareFill className="text-lg inline" />
                  &nbsp;Your film lists and activity data are stored on our
                  server are not shared by us to any third parties.
                </li>
                <li className="">
                  <GoSquareFill className="text-lg inline" />
                  &nbsp;We may use anonymized, aggregated data for analytics.
                </li>
              </ul>
            </div>
          </section>

          <section className="flex flex-col p-5 gap-2">
            <div className="uppercase inline-block text-lg md:text-xl">
              <span className="inline font-bold">
                8. THIRD-PARTY LINKS AND SERVICES
              </span>
            </div>
            <div className="flex flex-col">
              <div>
                The Website may contain links to third-party websites or
                services (like film databases, studios, or streaming platforms).
                We are not responsible for the content, privacy policies, or
                practices of any third-party sites.
              </div>
            </div>
          </section>

          <section className="flex flex-col p-5 gap-2">
            <div className="uppercase inline-block text-lg md:text-xl">
              <span className="inline font-bold">9. GOVERNING LAW</span>
            </div>
            <div className="flex flex-col">
              <div>
                These Terms shall be governed by and construed in accordance
                with the laws of the United States, without regard to its
                conflict of law principles.
              </div>
            </div>
          </section>

          <section className="flex flex-col p-5 gap-2">
            <div className="uppercase inline-block text-lg md:text-xl">
              <span className="inline font-bold">10. ENTIRE AGREEMENT</span>
            </div>
            <div className="flex flex-col">
              <div>
                These Terms, together with our Privacy Policy, constitute the
                entire agreement between you and The Film Atlas regarding your
                use of the Website.
              </div>
            </div>
          </section>

          <section className="flex flex-col p-5 gap-2">
            <div className="uppercase inline-block text-lg md:text-xl">
              <span className="inline font-bold">11. CONTACT</span>
            </div>
            <div className="flex flex-col">
              <div>
                If you have any questions about these Terms, please contact us
                via{" "}
                <span
                  onClick={() => navigate("/contact")}
                  className="text-blue-800 cursor-pointer">
                  this form
                </span>
                .
              </div>
            </div>
          </section>

          <section className="flex flex-col p-5 gap-2">
            <div className="flex flex-col italic">
              Thank you for using The Film Atlas. We hope you enjoy discovering
              and curating films from diverse regions around the world!
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
