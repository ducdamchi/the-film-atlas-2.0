import { createFileRoute } from '@tanstack/react-router'
// @ts-ignore - JS component
import Terms from '../components/Terms.jsx'

export const Route = createFileRoute('/terms')({
  component: Terms,
})
