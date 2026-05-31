import { Nav } from "@/racenroam/components/Nav";
import { Hero } from "@/racenroam/components/Hero";

import { Products } from "@/racenroam/components/Products";
import { About } from "@/racenroam/components/About";
import { Social } from "@/racenroam/components/Social";
import { Footer } from "@/racenroam/components/Footer";
import { CartDrawer } from "@/racenroam/components/CartDrawer";
import { CheckoutDialog } from "@/racenroam/components/CheckoutDialog";

const Index = () => (
  <div className="min-h-screen bg-background text-foreground">
    <Nav />
    <main>
      <Hero />
      <Products />
      <About />
      <Social />
    </main>
    <Footer />
    <CartDrawer />
    <CheckoutDialog />
  </div>
);

export default Index;
