import React, { useState } from "react"
import { fetchSubtitleFile } from "../Utils/apiCalls"

function SubtitleItem({ subtitle }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(false)

  const file = subtitle.attributes.files?.[0]

  function triggerDownload(url, filename) {
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
  }

  async function handleDownload() {
    const { release } = subtitle.attributes
    const filename = `${release || "subtitle"}.srt`

    if (blobUrl) {
      triggerDownload(blobUrl, filename)
      return
    }
    try {
      setLoading(true)
      const url = await fetchSubtitleFile(file.file_id, filename)
      setBlobUrl(url)
      triggerDownload(url, filename)
    } catch (err) {
      console.error("Error fetching subtitle download link:", err)
    } finally {
      setLoading(false)
    }
  }

  if (!file) return null

  const {
    ai_translated,
    machine_translated,
    comments,
    upload_date,
    release,
    download_count,
  } = subtitle.attributes
  const uploadYear = upload_date ? new Date(upload_date).getFullYear() : null
  const isTranslated = ai_translated || machine_translated

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="border-1 flex flex-col items-start justify-start gap-1 p-3 rounded-sm hover:bg-olive-200 transition-all ease-out duration-200 w-auto bg-olive-300 text-stone-900 border-olive-500 text-left">
      <div className="text-base font-medium truncate max-w-[26rem] lowercase">
        {release}
      </div>
      <div className="flex items-center gap-1 text-sm font-thin">
        {uploadYear && <span>{uploadYear}</span>}
        <span>|</span>
        <span>{`${download_count} downloads`}</span>
      </div>
      {isTranslated && (
        <div className="text-sm text-olive-100 bg-olive-600 p-1">
          {ai_translated ? "AI translated" : "Machine translated"}
        </div>
      )}
      {comments && (
        <div className="text-sm font-thin text-stone-900 line-clamp-2 max-w-[26rem] italic lowercase">
          {comments}
        </div>
      )}
    </button>
  )
}

const FILTER_THRESHOLD = 10
const PREFERRED_RELEASE = /bluray|web/i

export default function Subtitles({ subtitles }) {
  const filtered =
    subtitles.length >= FILTER_THRESHOLD
      ? subtitles.filter((s) =>
          PREFERRED_RELEASE.test(s.attributes.release ?? ""),
        )
      : subtitles
  const displayed = filtered.length > 0 ? filtered : subtitles

  return (
    <div className="hidden md:flex flex-col items-start justify-start">
      <div className="p-4 pt-2">
        <div className="landing-sectionTitle mb-1">subtitles</div>
        {displayed.length === 0 && (
          <div className="landing-sectionContent">No subtitles found.</div>
        )}
        {displayed.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-2">
            {displayed.map((subtitle, key) => (
              <SubtitleItem key={key} subtitle={subtitle} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
