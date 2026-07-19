import { describe, it, expect } from 'vitest'
import { isSafePreviewUrl } from './_urlGuard.js'

describe('isSafePreviewUrl — 허용', () => {
  it('공개 https/http 주소', () => {
    expect(isSafePreviewUrl('https://example.com/a?b=1')).toBe(true)
    expect(isSafePreviewUrl('http://naver.com')).toBe(true)
    expect(isSafePreviewUrl('https://93.184.216.34/')).toBe(true)
  })
})

describe('isSafePreviewUrl — 스킴 차단', () => {
  it('http/https 외 스킴', () => {
    expect(isSafePreviewUrl('file:///etc/passwd')).toBe(false)
    expect(isSafePreviewUrl('ftp://example.com')).toBe(false)
    expect(isSafePreviewUrl('gopher://example.com')).toBe(false)
    expect(isSafePreviewUrl('javascript:alert(1)')).toBe(false)
  })
  it('빈 값·깨진 URL', () => {
    expect(isSafePreviewUrl('')).toBe(false)
    expect(isSafePreviewUrl('not a url')).toBe(false)
    expect(isSafePreviewUrl(null)).toBe(false)
  })
})

describe('isSafePreviewUrl — 내부망 차단', () => {
  it('루프백', () => {
    expect(isSafePreviewUrl('http://127.0.0.1/')).toBe(false)
    expect(isSafePreviewUrl('http://127.9.9.9/')).toBe(false)
    expect(isSafePreviewUrl('http://localhost/')).toBe(false)
    expect(isSafePreviewUrl('http://LOCALHOST./')).toBe(false)
  })
  it('클라우드 메타데이터 주소', () => {
    expect(isSafePreviewUrl('http://169.254.169.254/latest/meta-data/')).toBe(false)
  })
  it('사설 대역', () => {
    expect(isSafePreviewUrl('http://10.0.0.1/admin')).toBe(false)
    expect(isSafePreviewUrl('http://192.168.0.1/')).toBe(false)
    expect(isSafePreviewUrl('http://172.16.0.1/')).toBe(false)
    expect(isSafePreviewUrl('http://172.31.255.255/')).toBe(false)
    expect(isSafePreviewUrl('http://100.64.0.1/')).toBe(false)
    expect(isSafePreviewUrl('http://0.0.0.0/')).toBe(false)
  })
  it('사설 대역에 인접한 공개 주소는 허용', () => {
    expect(isSafePreviewUrl('http://172.15.0.1/')).toBe(true)
    expect(isSafePreviewUrl('http://172.32.0.1/')).toBe(true)
    expect(isSafePreviewUrl('http://11.0.0.1/')).toBe(true)
  })
  it('난독화된 IP 표기(10진수·16진수·축약)', () => {
    expect(isSafePreviewUrl('http://2130706433/')).toBe(false)
    expect(isSafePreviewUrl('http://0x7f000001/')).toBe(false)
    expect(isSafePreviewUrl('http://127.1/')).toBe(false)
    expect(isSafePreviewUrl('http://0/')).toBe(false)
  })
  it('IPv6 루프백·사설·링크로컬', () => {
    expect(isSafePreviewUrl('http://[::1]/')).toBe(false)
    expect(isSafePreviewUrl('http://[fc00::1]/')).toBe(false)
    expect(isSafePreviewUrl('http://[fd12:3456::1]/')).toBe(false)
    expect(isSafePreviewUrl('http://[fe80::1]/')).toBe(false)
  })
  it('IPv4-mapped IPv6로 우회 시도', () => {
    expect(isSafePreviewUrl('http://[::ffff:127.0.0.1]/')).toBe(false)
    expect(isSafePreviewUrl('http://[::ffff:169.254.169.254]/')).toBe(false)
  })
  it('내부 전용 도메인 접미사', () => {
    expect(isSafePreviewUrl('http://foo.local/')).toBe(false)
    expect(isSafePreviewUrl('http://db.internal/')).toBe(false)
  })
})
