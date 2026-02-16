import { Header, Footer } from "@/presentation/components/layout";
import {
  HeroSection,
  ModulesSection,
  FeaturesSection,
  CTASection,
} from "@/presentation/components/sections";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <ModulesSection />
        <FeaturesSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
