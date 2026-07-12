type MapLikeLogoMarkProps = {
  className?: string;
  strokeWidth?: number;
};

const BRAND_BOOK_BLUE = "#7DD3FC";
const BRAND_PURPLE = "#A78BFA";
const BRAND_STAR_YELLOW = "#FACC15";
const BRAND_RING = "#2F3544";
const BRAND_WHITE = "#FFFFFF";

export function MapLikeLogoMark({ className = "h-10 w-10", strokeWidth = 3.5 }: MapLikeLogoMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 128 128"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="64" cy="64" r="58" fill={BRAND_WHITE} stroke={BRAND_RING} strokeWidth={strokeWidth} />
      <path
        d="M25 86 49 35l15 33 15-33 24 51"
        stroke={BRAND_BOOK_BLUE}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="10"
      />
      <path
        d="M35 84c19-9 39-9 58 0"
        stroke={BRAND_PURPLE}
        strokeLinecap="round"
        strokeWidth="6"
        opacity="0.86"
      />
      <path
        d="M94 17c2.1 0 3.8 1.2 4.6 3.2l3.7 9.2 9.2 3.7c2 .8 3.2 2.5 3.2 4.6s-1.2 3.8-3.2 4.6l-9.2 3.7-3.7 9.2c-.8 2-2.5 3.2-4.6 3.2s-3.8-1.2-4.6-3.2l-3.7-9.2-9.2-3.7c-2-.8-3.2-2.5-3.2-4.6s1.2-3.8 3.2-4.6l9.2-3.7 3.7-9.2c.8-2 2.5-3.2 4.6-3.2Z"
        fill={BRAND_STAR_YELLOW}
      />
      <path
        d="M94 31.5c.8 2.6 2.5 4.3 5.1 5.1-2.6.8-4.3 2.5-5.1 5.1-.8-2.6-2.5-4.3-5.1-5.1 2.6-.8 4.3-2.5 5.1-5.1Z"
        fill={BRAND_BOOK_BLUE}
      />
    </svg>
  );
}
