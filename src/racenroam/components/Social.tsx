import { Instagram, Youtube, Twitch } from "lucide-react";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.55a8.16 8.16 0 0 0 4.77 1.52V6.69h-1.84z" />
  </svg>
);

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3a13.6 13.6 0 0 0-.617 1.265 18.31 18.31 0 0 0-5.487 0A12.6 12.6 0 0 0 9.83 3a19.74 19.74 0 0 0-3.76 1.369C2.687 9.36 1.74 14.225 2.214 19.02A19.9 19.9 0 0 0 8.27 22a14.6 14.6 0 0 0 1.27-2.06 12.85 12.85 0 0 1-2-1c.168-.122.332-.25.49-.38a14.18 14.18 0 0 0 12.06 0c.16.13.323.258.49.38a12.84 12.84 0 0 1-2 1c.36.71.79 1.4 1.27 2.06a19.86 19.86 0 0 0 6.06-3c.55-5.55-.93-10.36-3.787-14.65zM8.68 16.18c-1.18 0-2.16-1.08-2.16-2.42s.96-2.42 2.16-2.42 2.18 1.08 2.16 2.42c0 1.34-.97 2.42-2.16 2.42zm6.64 0c-1.18 0-2.16-1.08-2.16-2.42s.96-2.42 2.16-2.42 2.18 1.08 2.16 2.42c0 1.34-.96 2.42-2.16 2.42z" />
  </svg>
);

const socials = [
  { Icon: Instagram, href: "https://www.instagram.com/racenroam/", label: "Instagram" },
  { Icon: TikTokIcon, href: "https://www.tiktok.com/@racenroam", label: "TikTok" },
  { Icon: DiscordIcon, href: "https://discord.gg/WPfaMywccD", label: "Discord" },
  { Icon: Youtube, href: "https://www.youtube.com/@RaceNRoam", label: "YouTube" },
  { Icon: Twitch, href: "https://www.twitch.tv/racenroam", label: "Twitch" },
];

export const Social = () => (
  <section id="social" className="bg-grey-dark py-16 px-5 md:px-12 text-center relative overflow-hidden">
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-[200px] whitespace-nowrap pointer-events-none"
      style={{ color: "hsl(0 0% 100% / 0.02)" }}
    >
      RACENROAM
    </div>
    <div className="relative">
      <div className="font-tech text-[11px] tracking-[5px] text-grey-light mb-7">// FOLLOW THE ROAM</div>
      <div className="flex items-center justify-center gap-5 flex-wrap">
        {socials.map(({ Icon, href, label }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="w-[52px] h-[52px] border border-grey-mid flex items-center justify-center text-grey-light clip-angle-sm transition-all hover:bg-primary hover:border-primary hover:text-foreground hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
          >
            <Icon className="w-5 h-5" />
          </a>
        ))}
      </div>
    </div>
  </section>
);
