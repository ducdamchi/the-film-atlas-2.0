import { createFileRoute } from '@tanstack/react-router'
// @ts-ignore - JS component
import Directors from '../components/Directors.jsx'

export const Route = createFileRoute('/directors')({
  component: Directors,
})
