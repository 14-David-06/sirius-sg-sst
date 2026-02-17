import { Header, Footer } from "@/presentation/components/layout";
import { HeroSection } from "@/presentation/components/sections";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
      </main>
      <Footer />
    </>
  );
}
