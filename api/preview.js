// URL 미리보기 프록시. GET /api/preview?url=https://...
// 대상 페이지 HTML의 OG 메타를 파싱해 반환. 외부 키 불필요, 실패 허용.

import { isSafePreviewUrl } from './_urlGuard.js'

function metaContent(html, prop) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i')
  const tag = html.match(re)
  if (!tag) return ''
  const c = tag[0].match(/content=["']([^"']*)["']/i)
  return c ? c[1] : ''
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}

function absolutize(image, base) {
  if (!image) return ''
  try { return new URL(image, base).toString() } catch { return image }
}

const MAX_REDIRECTS = 3
const TIMEOUT_MS = 8000
const MAX_BYTES = 500_000

// 리다이렉트를 직접 따라가며 홉마다 SSRF 가드를 다시 통과시킨다.
// (공개 https 주소가 302로 169.254.169.254 같은 내부 주소를 가리킬 수 있다)
async function safeFetch(startUrl, signal) {
  let url = startUrl
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    if (!isSafePreviewUrl(url)) throw new Error('blocked url')
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'manual',
      signal,
    })
    if (r.status < 300 || r.status > 399) return { res: r, finalUrl: url }
    const loc = r.headers.get('location')
    if (!loc) return { res: r, finalUrl: url }
    url = new URL(loc, url).toString()
  }
  throw new Error('too many redirects')
}

export default async function handler(req, res) {
  let url = (req.query && req.query.url ? req.query.url : '').toString()
  if (!isSafePreviewUrl(url)) { res.status(400).json({ error: 'bad url' }); return }
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS)
  try {
    const { res: r, finalUrl } = await safeFetch(url, ac.signal)
    const ct = r.headers.get('content-type') || ''
    if (ct && !/text\/html|application\/xhtml|text\/plain/i.test(ct)) throw new Error('not html')
    const buf = await r.arrayBuffer()
    const html = new TextDecoder('utf-8').decode(buf.slice(0, MAX_BYTES))
    url = finalUrl
    const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    const title = decodeEntities(metaContent(html, 'og:title') || (titleTag ? titleTag[1].trim() : ''))
    const description = decodeEntities(metaContent(html, 'og:description') || metaContent(html, 'description'))
    const image = absolutize(metaContent(html, 'og:image'), url)
    const site = decodeEntities(metaContent(html, 'og:site_name')) || new URL(url).hostname
    res.setHeader('Cache-Control', 's-maxage=86400')
    res.status(200).json({ title, description, image, site })
  } catch {
    res.status(200).json({ title: '', description: '', image: '', site: '' })
  } finally {
    clearTimeout(timer)
  }
}
