import React from "react"

export default function Torrents({ ytsTorrents }) {
  return (
    <div className="hidden md:flex flex-col items-start justify-start">
      <div className="p-4 pt-2">
        <div className="landing-sectionTitle mb-1">torrents</div>
        {ytsTorrents.length === 0 && (
          <div className="landing-sectionContent">No torrents found.</div>
        )}
        {ytsTorrents.length > 0 && (
          <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {ytsTorrents.map((torrent, key) => {
              return (
                <a key={key} href={torrent.url}>
                  <div className="border-1 flex flex-col items-center justify-center gap-1 p-2 pr-2 pl-2 rounded-sm hover:bg-slate-200 transition-all ease-out duration-200 w-auto bg-teal-300 text-stone-900 border-teal-300">
                    <div className="flex items-center justify-center gap-1 border-b-1 pb-1 uppercase">
                      <span className="">{torrent?.type}</span>
                      <span className="">{torrent?.quality}</span>
                      <span>{`[${torrent?.size}]`}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-base">
                      {/* <span>{`${torrent?.video_codec}`}</span> */}
                      <span>{`peers: ${torrent?.peers}`}</span>
                      <span>{`seeds: ${torrent?.seeds}`}</span>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
