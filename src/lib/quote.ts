export interface Quote { price: number; currency: string }

export function isLivePriced(
  asset: { symbol: string | null; quantity: number | null },
  quote: Quote | undefined,
  usdkrw: number | null,
): boolean {
  if (!asset.symbol || asset.quantity == null || !quote || !(quote.price > 0)) return false
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
