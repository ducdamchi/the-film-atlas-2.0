import { createFileRoute } from '@tanstack/react-router'
// @ts-ignore - JS component
import Films from '../components/Films.jsx'

export const Route = createFileRoute('/films')({
  component: Films,
})
