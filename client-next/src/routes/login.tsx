import { createFileRoute } from '@tanstack/react-router'
// @ts-ignore - JS component
import LogIn from '../components/LogIn.jsx'

export const Route = createFileRoute('/login')({
  component: LogIn,
})
