import logoImg from "@/racenroam/assets/racenroam-logo.jpg";

export const Hero = () => {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden pt-[72px]">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 60% 60% at 50% 30%, hsl(var(--primary) / 0.12) 0%, transparent 70%),
            repeating-linear-gradient(90deg, transparent, transparent 60px, hsl(0 0% 100% / 0.015) 60px, hsl(0 0% 100% / 0.015) 61px),
            repeating-linear-gradient(0deg, transparent, transparent 60px, hsl(0 0% 100% / 0.015) 60px, hsl(0 0% 100% / 0.015) 61px)`,
        }}
      />
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-0 -left-1/2 w-[200%] h-full animate-speedlines"
          style={{
            background:
              "repeating-linear-gradient(75deg, transparent 0px, transparent 80px, hsl(var(--primary) / 0.04) 80px, hsl(var(--primary) / 0.04) 82px)",
          }}
        />
      </div>

      <div className="relative z-[2] text-center flex flex-col items-center gap-7 animate-fade-up">
        <div className="w-[200px] h-[200px] rounded-full border-[3px] border-primary p-1.5 animate-pulse-ring">
          <img src={logoImg} alt="RaceNRoam logo" className="w-full h-full rounded-full object-cover" />
        </div>
        <div>
          <h1 className="font-display text-[clamp(60px,10vw,120px)] leading-[0.9] tracking-[6px] text-foreground" style={{ textShadow: "0 0 60px hsl(var(--primary) / 0.4)" }}>
            RACE<span className="text-primary-bright" style={{ textShadow: "0 0 30px hsl(var(--primary-bright) / 0.6)" }}>N</span>ROAM
          </h1>
          <div className="font-display text-[clamp(20px,4vw,48px)] tracking-[6px] text-grey-light mt-2">OFFICIAL MERCH</div>
        </div>
        <div className="font-tech text-xs tracking-[6px] text-grey-light uppercase">Gear for the Track & the Road</div>
        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <a href="#products" className="btn-race">Shop Collection</a>
          <a href="#about" className="btn-ghost-race">Our Story</a>
        </div>
      </div>

      <a href="#products" className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce-down no-underline">
        <span className="font-tech text-[9px] tracking-[4px] text-grey-light">SCROLL</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary">
          <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" />
        </svg>
      </a>
    </section>
  );
};
