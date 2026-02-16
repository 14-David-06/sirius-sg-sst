import { Header, Footer } from "@/presentation/components/layout";
import {
  HeroSection,
  ModulesSection,
  CTASection,
} from "@/presentation/components/sections";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <ModulesSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
