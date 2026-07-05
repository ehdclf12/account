export function formatKRW(n: number): string {
  return '₩' + Math.round(n).toLocaleString('ko-KR')
}
