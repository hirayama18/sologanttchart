import { LandingPage } from "@/components/features/landing/landing-page"
import { AuthRedirect } from "@/components/auth/auth-redirect"

export default function Home() {
  return (
    <AuthRedirect>
      <LandingPage />
    </AuthRedirect>
  )
}
