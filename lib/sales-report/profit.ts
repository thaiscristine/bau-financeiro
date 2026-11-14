// The Lojinha's profit counts cash, like the rest of the report: what came in
// from paid installments minus what was paid for stock. Most items have no
// recorded cost, so a margin per unit sold would be a guess.
export function storeProfit(received: number, restockCost: number) {
  // Rounded to cents, so float noise never shows a -R$ 0,00
  const profit = Math.round((received - restockCost) * 100) / 100 || 0;
  return {
    profit,
    // The share of what came in that stayed, only when there was a profit
    margin: received > 0 && profit > 0 ? profit / received : null,
  };
}
