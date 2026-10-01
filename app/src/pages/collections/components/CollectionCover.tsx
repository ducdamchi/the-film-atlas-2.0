interface CollectionCoverProps {
  src: string
}

export default function CollectionCover({ src }: CollectionCoverProps) {
  return (
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: `url(${src})` }}>
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.5)_100%)]" />
      <div className="film-grain" />
    </div>
  )
}
