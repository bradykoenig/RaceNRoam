interface ProductIconProps {
  type: "shirt" | "hat" | "hoodie" | "sticker";
  className?: string;
}

export const ProductIcon = ({ type, className = "w-16 h-16" }: ProductIconProps) => {
  switch (type) {
    case "shirt":
      return (
        <svg className={className} viewBox="0 0 64 64" fill="none">
          <path d="M8 20L16 12H24C24 12 26 16 32 16C38 16 40 12 40 12H48L56 20L48 26V54H16V26L8 20Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "hat":
      return (
        <svg className={className} viewBox="0 0 64 64" fill="none">
          <path d="M10 38C10 38 14 24 32 24C50 24 54 38 54 38H10Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M6 38H58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M6 38C6 38 4 42 8 42H56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="32" cy="24" r="2" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "hoodie":
      return (
        <svg className={className} viewBox="0 0 64 64" fill="none">
          <path d="M12 22L20 14H24C24 14 24 22 32 22C40 22 40 14 40 14H44L52 22L46 28V54H18V28L12 22Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M26 14C26 14 28 10 32 10C36 10 38 14 38 14" stroke="currentColor" strokeWidth="2" />
          <path d="M30 28V40" stroke="currentColor" strokeWidth="2" />
          <path d="M34 28V40" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "sticker":
      return (
        <svg className={className} viewBox="0 0 64 64" fill="none">
          <rect x="10" y="14" width="30" height="22" stroke="currentColor" strokeWidth="2" transform="rotate(-8 25 25)" />
          <rect x="22" y="22" width="30" height="22" stroke="currentColor" strokeWidth="2" transform="rotate(6 37 33)" />
          <path d="M16 20H32M16 26H28" stroke="currentColor" strokeWidth="1.5" transform="rotate(-8 25 25)" />
        </svg>
      );
  }
};
