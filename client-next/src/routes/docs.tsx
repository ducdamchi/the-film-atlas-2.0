import { createFileRoute } from '@tanstack/react-router'
// @ts-ignore - JS component
import Docs from '../components/Docs.jsx'

export const Route = createFileRoute('/docs')({
  component: Docs,
})
