export const Footer = () => (
  <footer className="bg-background border-t border-primary/20 px-5 md:px-12 py-12 flex items-center justify-between flex-wrap gap-6">
    <div className="font-display text-2xl tracking-[4px] text-primary-bright">RaceNRoam</div>
    <div className="flex flex-col gap-1">
      <span className="font-tech text-[9px] tracking-[2px] text-grey-light uppercase">Contact</span>
      <span className="font-tech text-[9px] tracking-[2px] text-grey-light uppercase">racenroam@gmail.com</span>
    </div>
    <div className="font-body text-xs text-grey-light tracking-wider">© {new Date().getFullYear()} RACENROAM // ALL RIGHTS RESERVED</div>
  </footer>
);
