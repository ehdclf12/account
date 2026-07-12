// URL 미리보기 프록시. GET /api/preview?url=https://...
// 대상 페이지 HTML의 OG 메타를 파싱해 반환. 외부 키 불필요, 실패 허용.

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

export default async function handler(req, res) {
  const url = (req.query && req.query.url ? req.query.url : '').toString()
  if (!/^https?:\/\//i.test(url)) { res.status(400).json({ error: 'bad url' }); return }
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const html = (await r.text()).slice(0, 200000)
    const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    const title = decodeEntities(metaContent(html, 'og:title') || (titleTag ? titleTag[1].trim() : ''))
    const description = decodeEntities(metaContent(html, 'og:description') || metaContent(html, 'description'))
    const image = absolutize(metaContent(html, 'og:image'), url)
    const site = decodeEntities(metaContent(html, 'og:site_name')) || new URL(url).hostname
    res.setHeader('Cache-Control', 's-maxage=86400')
    res.status(200).json({ title, description, image, site })
  } catch {
    res.status(200).json({ title: '', description: '', image: '', site: '' })
  }
}
