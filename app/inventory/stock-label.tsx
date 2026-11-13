export function StockLabel({
  tracksStock,
  stock,
}: {
  tracksStock: boolean;
  stock: number;
}) {
  if (!tracksStock) return <span className="text-zinc-500">Serviço</span>;
  return (
    <span className={stock > 0 ? "" : "font-medium text-red-600"}>
      {stock} {stock === 1 ? "unidade" : "unidades"}
    </span>
  );
}
