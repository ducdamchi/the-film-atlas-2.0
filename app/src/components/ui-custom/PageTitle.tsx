export default function PageTitle({
  title,
  className,
  variant = "default",
}: {
  title: string
  className?: string
  variant?: "default" | "map"
}) {
  const base =
    "font-heading uppercase font-bold text-xl @3xl:text-2xl flex items-center justify-center w-full"
  const variantStyles = variant === "map" ? "" : "hidden md:flex mt-10 md:mt-15"

  return (
    <div className={`${base} ${variantStyles} ${className ?? ""}`}>{title}</div>
  )
}
