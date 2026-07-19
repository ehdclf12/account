export interface Quote { price: number; currency: string }

export function isLivePriced(
  asset: { symbol: string | null; quantity: number | null },
  quote: Quote | undefined,
  usdkrw: number | null,
): boolean {
  // quantity는 > 0 이어야 한다. `== null`만 보면 0이 통과해 평가액이 0으로 지워진다.
  if (!asset.symbol || !(asset.quantity != null && asset.quantity > 0) || !quote || !(quote.price > 0)) return false
  if (quote.currency === 'USD') return !!usdkrw && usdkrw > 0
  return true
}

export function effectiveAmount(
  asset: { amount: number; symbol: string | null; quantity: number | null },
  quote: Quote | undefined,
  usdkrw: number | null,
): number {
  if (!isLivePriced(asset, quote, usdkrw)) return asset.amount
  const mult = quote!.currency === 'USD' ? usdkrw! : 1
  return Math.round(asset.quantity! * quote!.price * mult)
}
