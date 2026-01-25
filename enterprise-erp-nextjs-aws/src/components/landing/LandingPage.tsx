'use client';

import { Hero } from './Hero';
import { Work } from './Work';
import { Services } from './Services';
import { Portfolio } from './Portfolio';
import { VideoSection } from './VideoSection';
import { WhyTrust } from './WhyTrust';
import { About } from './About';
import { BancoTalentos } from './BancoTalentos';
import { LeadsterIntegration } from './LeadsterIntegration';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

interface LandingPageProps {
  isLoggedIn: boolean;
}

export function LandingPage({ isLoggedIn }: LandingPageProps) {
  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="pt-16">
        <Hero isLoggedIn={isLoggedIn} />
        <Work />
        <Services />
        <VideoSection />
        <Portfolio />
        <WhyTrust />
        <About />
        <BancoTalentos />
        <LeadsterIntegration />
        <Footer />
      </div>
    </main>
  );
}
