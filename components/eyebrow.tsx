import { eyebrowClass } from "./styles";

const SQUARE_TONES = {
  blue: "bg-blue",
  orange: "bg-orange",
  ink: "bg-ink",
  green: "bg-profit",
};

export function Eyebrow({
  tone = "blue",
  as: Tag = "p",
  children,
}: {
  tone?: keyof typeof SQUARE_TONES;
  as?: "p" | "h2" | "span";
  children: React.ReactNode;
}) {
  return (
    <Tag className={eyebrowClass}>
      <span aria-hidden className={`size-2 shrink-0 ${SQUARE_TONES[tone]}`} />
      {children}
    </Tag>
  );
}
