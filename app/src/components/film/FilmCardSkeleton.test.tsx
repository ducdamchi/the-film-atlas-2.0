import { render } from "@testing-library/react"
import FilmCardSkeleton from "./FilmCardSkeleton"

describe("FilmCardSkeleton — rendering", () => {
  it("renders without crashing", () => {
    const { container } = render(<FilmCardSkeleton />)
    expect(container.firstElementChild).toBeTruthy()
  })

  it("includes an animated pulse poster area", () => {
    const { container } = render(<FilmCardSkeleton />)
    expect(container.querySelector(".animate-pulse")).toBeTruthy()
  })

  it("includes the gradient bottom overlay", () => {
    const { container } = render(<FilmCardSkeleton />)
    expect(container.querySelector(".bg-gradient-to-t")).toBeTruthy()
  })
})
