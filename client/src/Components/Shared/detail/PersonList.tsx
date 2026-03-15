import { useNavigate } from "@tanstack/react-router"

/** A person from TMDB credits (cast or crew member with jobs array) */
interface PersonItem {
  id: number
  name: string
  profile_path: string | null
  /** Present for crew members — list of job titles, e.g. ["Director", "Producer"] */
  jobs?: string[]
  /** Present for crew (non-actor) persons coming from filmography */
  known_for_department?: string
  /** Present for cast members */
  character?: string
}

interface PersonListProps {
  title: string
  listOfPeople: PersonItem[]
  /** "cast" renders the character name; "crew" renders the jobs list */
  type: "cast" | "crew"
}

export default function PersonList({ title, listOfPeople, type }: PersonListProps) {
  const imgBaseUrl = "https://image.tmdb.org/t/p/original"
  const navigate = useNavigate()

  return (
    <div className="flex flex-col justify-start items-center pl-3 pr-3 pt-2 drop-shadow-2xl mr-0 ">
      <div className="landing-sectionTitle mb-2 w-full">{title}</div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
        {listOfPeople.map((person, key) => {
          return (
            <div
              key={key}
              className="relative w-[6.4rem] lg:w-[8rem] 2xl:w-[10rem] aspect-2/3 flex flex-col mb-1 bg-white rounded-none">
              <div className="w-full h-[70%] aspect-square overflow-hidden z-10">
                <img
                  className="object-cover grayscale w-full transform hover:scale-[1.05] transition-all duration-300 ease-out drop-shadow-2xl rounded-t-none transform -translate-y-2"
                  src={
                    person.profile_path !== null
                      ? `${imgBaseUrl}${person.profile_path}`
                      : `/picnotfound.jpg`
                  }
                />
              </div>
              <div className="font-bold h-auto w-full flex flex-col items-start justify-start text-sm lg:text-base text-center text-left text-stone-900 p-2 z-20 inline-block wrap-anywhere">
                {person.jobs?.includes("Director") && (
                  <div
                    className="uppercase w-full hover:text-hover-link"
                    onClick={() => {
                      navigate({ to: `/person/director/${person.id}` })
                    }}>
                    {person.name}
                  </div>
                )}
                {person.known_for_department?.includes("Acting") && (
                  <div
                    className="uppercase w-full hover:text-hover-link"
                    onClick={() => {
                      navigate({ to: `/person/actor/${person.id}` })
                    }}>
                    {person.name}
                  </div>
                )}
                {!person.jobs?.includes("Director") &&
                  !person.known_for_department?.includes("Acting") && (
                    <div className="uppercase w-full">{person.name}</div>
                  )}
                {type === "cast" && (
                  <div className="font-extralight text-xs lg:text-sm">{`as ${person.character}`}</div>
                )}
                {type === "crew" && person.jobs && (
                  <div className="font-extralight text-xs lg:text-sm">
                    {person.jobs.map((job, key) => (
                      <span key={key}>
                        {job}
                        {key !== person.jobs!.length - 1 && <span>, </span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
