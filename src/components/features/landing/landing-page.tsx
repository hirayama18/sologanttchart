import { Navigation } from "./navigation"
import { HeroSection } from "./hero-section"
import { FeaturesSection } from "./features-section"
import { BenefitsSection } from "./benefits-section"
import { CTASection } from "./cta-section"
import { Footer } from "./footer"

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <HeroSection />
      <div id="features">
        <FeaturesSection />
      </div>
      <div id="benefits">
        <BenefitsSection />
      </div>
      <div id="pricing">
        <CTASection />
      </div>
      <div id="contact">
        <Footer />
      </div>
    </div>
  )
}
