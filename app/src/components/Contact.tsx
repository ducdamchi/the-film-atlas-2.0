import { useState } from "react"
import Swal from "sweetalert2"

export default function Contact() {
  const [sent, setSent] = useState(false)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    formData.append("access_key", "00355082-0749-4c04-8d55-ff78fa9fd483")

    const object = Object.fromEntries(formData)
    const json = JSON.stringify(object)

    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: json,
    }).then((res) => res.json() as Promise<{ success: boolean }>)

    if (res.success) {
      setSent(true)
      Swal.fire({
        title: "Thanks for reaching out!",
        text: "Your message has been received and we will get back to you as soon as possible.",
        confirmButtonText: "Close",
      })
    }
  }

  return (
    <div className="font-primary mb-20 min-h-screen">
      <div className="flex flex-col items-center text-base md:text-lg ">
        <div className="font-heading page-title">Contact</div>
        <div className="relative mt-[4rem] mb-[4rem] flex h-auto w-full flex-col items-center justify-center gap-1">
          <div className="m-2 p-4">
            For all inquiries, please contact us using the form below.
          </div>
          <div className="m-2 gap-1 border-1   rounded-none p-7 min-w-[20rem] w-[70%] max-w-[40rem] bg-[linear-gradient(-65deg,rgba(175,175,175,0.05)_20%,rgba(175,175,175,0.25)_100%)]">
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  name="name"
                  id="name"
                  autoComplete="name"
                  className="border-1 rounded-none bg-background p-2"
                  placeholder="Name"
                  required></input>
              </div>
              <div className="flex flex-col gap-1">
                <input
                  type="email"
                  name="email"
                  id="email"
                  autoComplete="email"
                  className="border-1 rounded-none bg-background p-2"
                  placeholder="Email"
                  required></input>
              </div>
              <div className="flex flex-col gap-1">
                <textarea
                  name="message"
                  id="message"
                  className="message-box border-1 rounded-none bg-background p-2 min-h-[10rem]"
                  placeholder="Message"
                  required></textarea>
              </div>
              <button
                className="w-[20%] self-end border-1 rounded-none bg-background p-1 hover:text-light hover:bg-background transition-all ease-out duration-200"
                type="submit">
                <div className="submit-button-text">Send</div>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
