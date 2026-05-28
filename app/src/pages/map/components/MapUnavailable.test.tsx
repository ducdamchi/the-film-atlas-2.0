import { render, screen } from "@testing-library/react"
import { MapUnavailable } from "./MapUnavailable"

describe("MapUnavailable", () => {
  it("renders the main heading", () => {
    render(<MapUnavailable />)
    expect(
      screen.getByText(/map unavailable/i)
    ).toBeTruthy()
  })

  it("renders Chrome instructions", () => {
    render(<MapUnavailable />)
    expect(screen.getByText(/chrome/i)).toBeTruthy()
  })

  it("renders Firefox instructions", () => {
    render(<MapUnavailable />)
    expect(screen.getByText(/firefox/i)).toBeTruthy()
  })

  it("renders Safari instructions", () => {
    render(<MapUnavailable />)
    expect(screen.getByText(/safari/i)).toBeTruthy()
  })
})
