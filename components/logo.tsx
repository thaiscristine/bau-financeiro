import Image from "next/image";
import logo from "@/public/sbc-logo.jpg";

// The artwork has a white background, so it sits on a white tile that blends
// into light surfaces and reads as a badge in dark mode.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-[4px] bg-white ${className}`}
    >
      <Image
        src={logo}
        alt="Núcleo Bandeirante São Bernardo"
        className="h-full w-auto"
        priority
      />
    </span>
  );
}
