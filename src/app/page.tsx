import type { Metadata } from "next";
import { AccountabilitySection } from "@/components/landing/AccountabilitySection";
import { FinalCta } from "@/components/landing/FinalCta";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingNav } from "@/components/landing/LandingNav";
import { PlatformCards } from "@/components/landing/PlatformCards";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { WorkflowSection } from "@/components/landing/WorkflowSection";

export const metadata: Metadata = {
  title: { absolute: "Shuttler | University transportation without the change hassle" },
  description: "Shuttler connects students, approved campus shuttle drivers and universities, and keeps a confirmed record of the fare, the cash paid and the change owed.",
};

export default function HomePage() {
  return (
    <>
      <LandingNav />
      <main id="main">
        <Hero />
        <ProblemSection />
        <WorkflowSection />
        <PlatformCards />
        <AccountabilitySection />
        <HowItWorks />
      </main>
      <FinalCta />
    </>
  );
}
