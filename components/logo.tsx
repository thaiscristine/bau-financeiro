import Image from "next/image";
import logo from "@/public/ami-sbc-logo.png";

// The artwork is a round badge on a transparent background, so it needs no
// backing tile on either light or dark surfaces.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 ${className}`}>
      <Image
        src={logo}
        alt="Associação Amigos do Núcleo Bandeirante São Bernardo"
        className="h-full w-auto"
        priority
      />
    </span>
  );
}
