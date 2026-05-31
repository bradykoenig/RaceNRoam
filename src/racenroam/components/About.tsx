import logoImg from "@/racenroam/assets/racenroam-logo.jpg";

export const About = () => (
  <section id="about" className="bg-background relative py-24 px-5 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-20 items-center max-w-6xl mx-auto">
    <div className="absolute top-0 inset-x-0 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--grey-mid)), transparent)" }} />
    <div className="relative hidden md:flex items-center justify-center">
      <div className="absolute w-[340px] h-[340px] rounded-full border border-dashed border-primary/25 animate-spin-slow" />
      <div className="w-[280px] h-[280px] rounded-full border-2 border-primary p-2 relative z-[2]" style={{ boxShadow: "0 0 60px hsl(var(--primary) / 0.3)" }}>
        <img src={logoImg} alt="RaceNRoam" className="w-full h-full rounded-full object-cover" />
      </div>
    </div>
    <div>
      <div className="font-tech text-[10px] tracking-[5px] text-primary-bright uppercase mb-3">002 // Story</div>
      <h2 className="font-display text-[clamp(40px,6vw,72px)] tracking-[4px] leading-none mb-12">BUILT FOR<br/>THE DRIVEN</h2>
      <p className="font-body text-[17px] leading-relaxed text-grey-text mb-5">
        RaceNRoam started in the sim room — a father and son chasing apexes together on iRacing, lap after lap, late into the night. What began as bonding over a wheel and pedals turned into a real team: Dad built his own teammate.
      </p>
      <p className="font-body text-[17px] leading-relaxed text-grey-text">
        From the rig at home to the open road in the RV — this brand is for every parent who races with their kid, every kid who outgrew the passenger seat, and every family that turned hot laps into a tradition.
      </p>
      <div className="grid grid-cols-3 gap-6 mt-10 pt-10 border-t border-grey-mid">
        {[
          { num: "100%", label: "Driven" },
          { num: "24/7", label: "Throttle" },
          { num: "0–60", label: "Mindset" },
        ].map((s) => (
          <div key={s.label}>
            <div className="font-display text-[42px] text-primary-bright leading-none">{s.num}</div>
            <div className="font-tech text-[9px] tracking-[3px] text-grey-light uppercase mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
