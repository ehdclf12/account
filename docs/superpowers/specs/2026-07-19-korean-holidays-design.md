# 캘린더 한국 공휴일 표시 — 설계

2026-07-19

## 목표

캘린더 화면에 한국 공휴일을 표시한다. 음력 공휴일(설날·추석·부처님오신날)과
대체공휴일까지 정확해야 하므로 공공데이터포털 공식 API를 쓴다.
겸사겸사 주말 색 구분도 넣는다.

## 데이터 출처

한국천문연구원 특일 정보 — `getRestDeInfo`

```
GET https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo
  ?serviceKey=<디코딩된 키>&solYear=2026&numOfRows=100&_type=json
```

2026년 실제 응답으로 검증한 사실:

- `totalCount: 22`. **`numOfRows` 기본값이 10이라 지정하지 않으면 12개가 잘린다.**
- `response.body.items.item`은 배열. 단, 결과가 1건이면 단일 객체로 오는
  경우가 있어 정규화에서 `[].concat()` 처리한다.
- `locdate`는 문자열이 아니라 **숫자** `20260101`.
- 대체공휴일은 `대체공휴일(삼일절)` 형태의 별도 항목으로 들어온다.
- 2026년 응답은 전 항목이 `isHoliday: "Y"`였다. 그래도 `"Y"`만 통과시킨다.
- **제헌절(7/17)·노동절(5/1)도 `Y`로 들어온다.** 제헌절은 2008년부터 공휴일이
  아니고 노동절은 관공서가 근무하지만, 공식 데이터를 그대로 신뢰해 표시한다.
  나중에 제외하려면 정규화에서 이름 기준 필터 한 줄이면 된다.

### 서비스키

`DATA_GO_KR_SERVICE_KEY` — **`VITE_` 접두를 붙이지 않는다**(붙이면 클라이언트
번들에 실린다). data.go.kr은 인코딩/디코딩 두 버전을 주는데, **디코딩된 키**를
넣고 `URLSearchParams`가 인코딩하게 한다. 인코딩된 키를 또 인코딩하면 401.

로컬은 `.env`(gitignore됨), 배포는 Vercel 환경변수. 커밋하지 않는다.

## 아키텍처

```
CalendarScreen
  └ useHolidays(years)              react-query, 연 단위
      └ GET /api/holidays?year=2026
          └ api/holidays.js         프록시(키 보관, 연도 검증, 캐시 헤더)
              └ api/_holidays.js    정규화 → { "2026-03-01": "삼일절", ... }
      └ localStorage 영속 (holidays_2026)
```

클라이언트는 `{ISO: 이름}` 맵만 받는다. data.go.kr 응답 형태를 화면 코드가
알 필요가 없다.

### 연도 경계

`monthGrid`는 42칸 고정이라 격자가 연도를 걸친다. 2026년 12월 격자에는
2027년 1월 1일(신정)이 들어온다. 따라서 **셀에 실제로 등장하는 연도만** 뽑아
조회한다 — 보통 1개, 경계에선 2개. 결과는 하나의 맵으로 합친다.

### 파일

| 파일 | 역할 |
|---|---|
| `api/holidays.js` | 프록시. `?year=` 검증(2000~2100), 캐시 헤더 |
| `api/_holidays.js` | 응답 정규화 (순수, 테스트 대상) |
| `src/lib/holidays.ts` | 표시 로직 `weekdayTone` / `isRedDay` (순수) |
| `src/hooks/useHolidays.ts` | react-query + localStorage |
| `src/screens/CalendarScreen.tsx` | 색·이름 렌더 |

`_` 접두 파일은 Vercel이 함수로 배포하지 않는다(`_urlGuard.js`와 같은 패턴).

## 화면

- **요일 헤더** — 토 파랑(`text-brand`), 일 빨강(`text-danger`). 새 색 토큰 없음
- **날짜 숫자** — 공휴일·일요일 빨강, 토요일 파랑, 그 외 현행 유지.
  이전/다음 달 날짜는 지금처럼 흐리게 하되 색조는 유지
- **공휴일 이름** — 날짜 아래 작게 빨간 글씨, 말줄임.
  이름이 있는 칸은 체크리스트를 3개→2개로 줄여 칸 높이를 유지
- **하단 상세** — 선택한 날이 공휴일이면 제목 옆에 이름 표시

## 캐싱

- 서버리스: `Cache-Control: s-maxage=86400, stale-while-revalidate=604800`.
  공휴일은 확정되면 안 바뀌므로 길게 잡는다
- react-query: `staleTime` 24시간
- localStorage: 성공 시 `holidays_<year>`에 저장, 다음 진입 시 `initialData`로
  즉시 표시. 오프라인·API 장애에도 이전에 본 해는 계속 보인다

이 조합이면 실제 외부 호출은 해마다 몇 번 수준이라 무료 등급 일일 한도에
여유가 크다.

## 실패 처리

키가 없거나, 네트워크가 끊겼거나, 응답이 깨졌으면 **빈 맵을 반환하고 캘린더는
공휴일 없이 정상 동작**한다. 조회 실패는 mutation이 아니므로 전역 에러 토스트가
뜨지 않는다(의도된 동작). 이전에 본 해는 localStorage에서 살아난다.

즉 **키 발급 전에도 앱은 정상 동작**하고, 공휴일만 안 보인다.

## 테스트

`api/_holidays.test.js` — 정규화
- 정상 배열 응답 → ISO 맵
- 결과 1건이 단일 객체로 올 때
- `isHoliday: "N"` 제외
- `locdate` 숫자 → `YYYY-MM-DD`
- 빈 응답 / `items`가 빈 문자열 / 깨진 구조 → `{}`
- 에러 resultCode → `{}`

`src/lib/holidays.test.ts` — 표시 로직
- `weekdayTone`: 토=blue, 일=red, 평일=normal
- 공휴일이 평일에 오면 red
- 공휴일이 토요일에 오면 red(공휴일 우선)

기존 124개 테스트는 그대로 통과해야 한다.

## 범위 밖

- 공휴일을 가계부 로직(고정비 이체일 등)에 반영하는 것
- 사용자 지정 기념일
- 공휴일 기준 알림
