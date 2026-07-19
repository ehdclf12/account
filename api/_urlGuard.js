// SSRF 가드: /api/preview가 내부망을 향해 요청하지 못하도록 막는다.
//
// WHATWG URL 파서가 2130706433 / 0x7f000001 / 127.1 같은 표기를 전부
// 점 4자리로 정규화해 주므로, 정규화된 hostname만 검사하면 된다.
//
// 한계: DNS 리바인딩(공개 도메인이 사설 IP로 해석되는 경우)은 막지 못한다.
// 그건 조회 후 소켓 단계 고정이 필요해 서버리스에서는 비용이 크다.
// 리다이렉트는 handler 쪽에서 홉마다 이 함수를 다시 통과시킨다.

const BLOCKED_SUFFIXES = ['.local', '.internal', '.localdomain', '.home.arpa']

function ipv4Blocked(h) {
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return null // IPv4가 아님
  const [a, b] = [Number(m[1]), Number(m[2])]
  if (m.slice(1).some((o) => Number(o) > 255)) return true
  if (a === 0) return true // 0.0.0.0/8
  if (a === 10) return true // 사설
  if (a === 127) return true // 루프백
  if (a === 169 && b === 254) return true // 링크로컬(메타데이터 169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true // 사설
  if (a === 192 && b === 168) return true // 사설
  if (a === 192 && b === 0) return true // 192.0.0.0/24 IETF
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT 100.64.0.0/10
  if (a === 198 && (b === 18 || b === 19)) return true // 벤치마크
  if (a >= 224) return true // 멀티캐스트·예약
  return false
}

function ipv6Blocked(inner) {
  const v6 = inner.toLowerCase()
  if (v6 === '::1' || v6 === '::') return true // 루프백·미지정
  // IPv4-mapped(::ffff:7f00:1 등)는 내장된 v4 주소로 재검사
  const mapped = v6.match(/^::ffff:(.+)$/)
  if (mapped) {
    const tail = mapped[1]
    if (tail.includes('.')) return ipv4Blocked(tail) === true
    const hex = tail.split(':')
    if (hex.length === 2) {
      const n = (parseInt(hex[0], 16) << 16) | parseInt(hex[1], 16)
      const dotted = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
      return ipv4Blocked(dotted) === true
    }
  }
  if (/^f[cd]/.test(v6)) return true // fc00::/7 유니크 로컬
  if (/^fe[89ab]/.test(v6)) return true // fe80::/10 링크로컬
  return false
}

export function isSafePreviewUrl(raw) {
  let u
  try {
    u = new URL(String(raw ?? ''))
  } catch {
    return false
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false

  // 후행 점(LOCALHOST. → localhost.) 제거 후 검사
  const host = u.hostname.toLowerCase().replace(/\.$/, '')
  if (!host) return false

  if (host.startsWith('[') && host.endsWith(']')) return !ipv6Blocked(host.slice(1, -1))

  const v4 = ipv4Blocked(host)
  if (v4 !== null) return !v4

  if (host === 'localhost' || host.endsWith('.localhost')) return false
  if (BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) return false

  return true
}
