import { createFileRoute } from '@tanstack/react-router'
// @ts-ignore - JS component
import Contact from '../components/Contact.jsx'

export const Route = createFileRoute('/contact')({
  component: Contact,
})
