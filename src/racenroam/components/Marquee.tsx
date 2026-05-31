export const Marquee = () => (
  <div className="bg-primary py-5 px-5 md:px-12 overflow-hidden whitespace-nowrap">
    <div className="inline-block animate-marquee font-display text-lg tracking-[4px] text-foreground">
      {Array.from({ length: 2 }).map((_, group) => (
        <span key={group}>
          {["FREE SHIPPING", "LOWER 48", "FREE SHIPPING", "LOWER 48"].map((t, i) => (
            <span key={i} className="opacity-60 mx-10">// {t}</span>
          ))}
        </span>
      ))}
    </div>
  </div>
);
