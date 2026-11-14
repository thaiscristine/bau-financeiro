export function StockLabel({
  tracksStock,
  stock,
}: {
  tracksStock: boolean;
  stock: number;
}) {
  if (!tracksStock) return <span className="text-muted">Serviço</span>;
  return (
    <span className={stock > 0 ? "" : "text-cost"}>
      {stock} {stock === 1 ? "unidade" : "unidades"}
    </span>
  );
}
