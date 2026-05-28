import Image from "next/image";
import maisLogo from "./mais-logo.png";

type MapLikeLogoMarkProps = {
  className?: string;
  strokeWidth?: number;
};

export function MapLikeLogoMark({ className = "h-10 w-10" }: MapLikeLogoMarkProps) {
  return (
    <Image
      aria-hidden="true"
      alt=""
      className={`${className} object-contain`}
      priority
      src={maisLogo}
    />
  );
}
