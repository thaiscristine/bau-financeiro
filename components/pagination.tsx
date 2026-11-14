import Link from "next/link";
import { secondaryButtonClass } from "./styles";

const disabledClass = `${secondaryButtonClass} pointer-events-none opacity-40`;

// Prev/next links for a list split into pages through the `page` search param.
// Renders nothing when everything fits on one page.
export function Pagination({
  basePath,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const href = (target: number) =>
    target === 1 ? basePath : `${basePath}?page=${target}`;

  return (
    <nav
      aria-label="Paginação"
      className="flex flex-wrap items-center justify-between gap-4"
    >
      <p className="font-mono text-xs tracking-[0.05em] text-muted uppercase">
        {first === last ? first : `${first}-${last}`} de {total}
      </p>
      <div className="flex items-center gap-3">
        {page > 1 ? (
          <Link href={href(page - 1)} className={secondaryButtonClass}>
            Anterior
          </Link>
        ) : (
          <span aria-disabled className={disabledClass}>
            Anterior
          </span>
        )}
        <span className="text-[15px] whitespace-nowrap text-muted tabular-nums">
          {page} / {pages}
        </span>
        {page < pages ? (
          <Link href={href(page + 1)} className={secondaryButtonClass}>
            Próxima
          </Link>
        ) : (
          <span aria-disabled className={disabledClass}>
            Próxima
          </span>
        )}
      </div>
    </nav>
  );
}
