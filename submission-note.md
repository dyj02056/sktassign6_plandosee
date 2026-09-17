# T07 제출 노트 — 플랜두씨 다이어리 2

> 인증을 붙이고, 어떻게 붙였는지 설명하기

---

## 0. 한눈에 보기

| 항목 | 값 |
|------|-----|
| 결과물 URL | https://sktassign7-auth.vercel.app |
| 소스 저장소 | https://github.com/dyj02056/sktassign6_plandosee |
| 브랜치 | `t07-auth` (main에서 파생) |
| **T06 조상 commit** | `beb39fa9e42657b6b57b35cf5bd4cbd5ff7b3d3e` |
| T07 최종 commit | (5일 후 확정) |
| 계정 A (소유자) | jsw09172@gmail.com |
| 계정 B (검증용) | jsw09173@gmail.com |

**인증 요약**: NextAuth (Auth.js) v5 `5.0.0-beta.32` + JWT 세션 + `sessionVersion` 무효화 + `bcryptjs` `3.0.3`

---

## ① 무엇으로 붙였나

### 선택한 것

| 계층 | 선택 | 버전 |
|------|------|------|
| 인증 프레임워크 | **NextAuth (Auth.js) v5** | `5.0.0-beta.32` |
| DB 어댑터 | `@auth/drizzle-adapter` | `1.11.3` |
| 비밀번호 해싱 | **bcryptjs** | `3.0.3` (cost factor 10) |
| 세션 방식 | **JWT** + DB의 `sessionVersion` 검증 | — |
| 세션 만료 | 7일 | — |

### 함께 검토했지만 고르지 않은 방법

| 방법 | 고르지 않은 이유 |
|------|------------------|
| **DB 세션** (NextAuth `strategy: 'database'`) | Credentials Provider와 함께 쓸 수 없음 (`UnsupportedStrategy` 오류 발생). OAuth 전용. |
| **직접 구현** (`jose` + `bcrypt` + httpOnly 쿠키) | 보안 실수 위험이 크고, 5일 사용·기록에 쓸 시간을 확보하기 어려움. |
| **Lucia** | 유지보수 모드 전환, Next.js 16 호환성 불확실. |

---

## ② 왜 그걸 골랐나

### 선택 이유

1. **NextAuth v5**: Next.js 16 App Router에 최적화. 가입·로그인·로그아웃·세션·CSRF 보호를 라이브러리가 처리 → **T07-C94~C99를 대부분 라이브러리가 충족**.
2. **JWT + sessionVersion**: Credentials Provider는 DB 세션과 함께 쓸 수 없어 JWT를 선택. JWT의 약점("발급 후 취소 불가")은 `user.sessionVersion`을 매 요청마다 DB와 비교하여 보완 → **T07-C114(로그아웃·비밀번호 변경 시 이전 토큰 무효) 충족**.
3. **bcryptjs**: 널리 쓰이는 해싱 라이브러리. cost 10은 서버리스 환경에서 응답 시간과 보안의 균형점. T07-C101~C107 충족.
4. **JWT 쿠키**: `httpOnly` + `sameSite: 'lax'` + `secure`(프로덕션) → 주소창에 실려 다니지 않음 (T07-C112).

### 내부 흐름 (T07-C128)

#### 가입 흐름
```
/signup 페이지 (클라이언트)
  → POST /api/auth/signup (src/app/api/auth/signup/route.ts)
     → Zod 검증 (email, password, name)
     → 중복 이메일 확인 (user.email unique)
     → bcrypt.hash(password, 10)
     → db.insert(user).values({ email, passwordHash, name })
  → /login?registered=1 로 이동
```

#### 로그인 흐름
```
/login 페이지 → HomeLogin 컴포넌트
  → signIn('credentials', { email, password, redirect: false })  (next-auth/react)
     → POST /api/auth/callback/credentials
        → src/auth.ts의 authorize() 실행
           → Zod 검증
           → db.query.user.findFirst({ where: eq(user.email, ...) })
           → bcrypt.compare(password, found.passwordHash)
           → 성공 시 { id, email, name, sessionVersion } 반환
        → JWT 콜백 실행: token.id, token.sessionVersion 저장
        → 쿠키(authjs.session-token) 발급
  → window.location.href = '/'  (하드 리다이렉트)
```

#### 로그아웃 흐름
```
LogoutButton 클릭
  → POST /api/auth/logout (src/app/api/auth/logout/route.ts)
     → session.user.id 확인
     → db.update(user).set({ sessionVersion: sql`${user.sessionVersion} + 1` })
  → signOut({ callbackUrl: '/login' })  (next-auth/react)
     → 쿠키 삭제
  → /login 으로 이동
```

#### 자료 조회 흐름 (예: /plans)
```
/plans (서버 컴포넌트)
  → auth() 호출 (src/auth.ts)
     → 미들웨어가 세션 확인 (auth.config.ts의 authorized 콜백)
     → jwt 콜백: DB의 sessionVersion과 JWT의 sessionVersion 비교
     → 불일치 시 null 반환 (세션 무효)
  → db.select().from(plan)
       .where(and(eq(plan.userId, session.user.id), isNull(plan.deletedAt)))
  → 본인 plan만 반환
```

#### 보호 경로 접근 흐름 (미들웨어)
```
middleware.ts
  → NextAuth(authConfig).auth
     → authorized 콜백 실행
        - '/' | /login | /signup | /api/* → 통과
        - 그 외 + 로그인 안 됨 → /login으로 리다이렉트
        - 그 외 + 로그인 됨 → 통과
```

---

## ③ 어디를 어떻게 고쳤나

### T06 대비 변경점

#### DB 스키마 (`src/db/schema.ts`)

**추가된 테이블 4개** (NextAuth + Drizzle Adapter 표준):
| 테이블 | 역할 |
|--------|------|
| `user` | 계정 (id, email unique, passwordHash, sessionVersion, ...) |
| `session` | DB 세션 (JWT 방식이라 미사용이지만 Adapter가 요구) |
| `account` | OAuth용 (미사용이지만 Adapter가 요구) |
| `verification_token` | 이메일 인증용 (미사용이지만 Adapter가 요구) |

**기존 5개 테이블에 `user_id` 컬럼 추가**:
- `plan.userId` (FK → user.id, NOT NULL, index)
- `plan_revision.userId`
- `task.userId`
- `execution_log.userId`
- `review_note.userId`

#### 새로 만든 파일

| 파일 | 역할 |
|------|------|
| `src/auth.ts` | NextAuth 설정 (authorize, jwt, session 콜백) |
| `src/auth.config.ts` | **Edge 안전 경량 설정** (미들웨어 전용) |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth API 핸들러 |
| `src/app/api/auth/signup/route.ts` | 회원가입 API |
| `src/app/api/auth/logout/route.ts` | 로그아웃 API (sessionVersion 증가) |
| `src/middleware.ts` | 보호 경로 리다이렉트 |
| `src/app/login/page.tsx` | 로그인 페이지 (HomeLogin 재사용) |
| `src/app/signup/page.tsx` | 회원가입 페이지 |
| `src/types/next-auth.d.ts` | Session 타입 확장 |
| `src/components/domain/HomeLogin.tsx` | 로그인 UI |
| `src/components/domain/HomeDashboard.tsx` | 로그인 후 홈 |
| `src/components/domain/LogoutButton.tsx` | 로그아웃 버튼 |

#### 소유권 검사 추가 (T07-C116~C126)

**5개 API 라우트**:
- `src/app/api/plans/route.ts` — GET/POST에 `eq(userId)` 필터 및 주입
- `src/app/api/plans/[id]/route.ts` — `loadOwnedPlan()` 헬퍼로 404 반환
- `src/app/api/tasks/route.ts` — 부모 plan 소유권 확인
- `src/app/api/executions/route.ts` — 부모 task 소유권 확인
- `src/app/api/review/notes/route.ts` — 부모 plan 소유권 확인

**6개 페이지 컴포넌트** (서버 컴포넌트가 DB 직접 조회하므로 소유권 검사 필요):
- `src/app/page.tsx`
- `src/app/plans/page.tsx`
- `src/app/plans/[id]/page.tsx`
- `src/app/tasks/page.tsx`
- `src/app/logs/page.tsx`
- `src/app/review/page.tsx`

### 거절을 만들어내는 소스 위치 (T07-C126)

| 위치 | 역할 |
|------|------|
| `src/app/api/plans/[id]/route.ts`의 `loadOwnedPlan()` | `eq(plan.userId, userId)` 불일치 시 **404** 반환 |
| `src/middleware.ts`의 `authorized` 콜백 | 로그인 안 됨 + 보호 경로 → **/login 리다이렉트** |
| 각 API 라우트의 `auth()` null 체크 | 로그인 없음 → **401 Unauthorized** |
| 각 페이지 컴포넌트의 `eq(userId)` 필터 | 목록에서 남의 자료 제외 |

---

## ④ 안 열리는 것을 확인한 기록 (T07-C129)

### 검증 환경

- 계정 A (소유자): jsw09172@gmail.com / plan id: `3507fb5f-b830-4608-a42c-7f9fc3d5e1ef`
- 계정 B (검증용): jsw09173@gmail.com / plan id: `517ab4d8-9571-46a5-870f-0ec662a06ea7`

### 검증 1 — 로그인 없이 자료 화면 접근 (T07-C97)

```
요청: 브라우저에서 https://sktassign7-auth.vercel.app/plans (로그아웃 상태)
응답: /login 으로 리다이렉트
결과: 자료 대신 로그인 화면 표시
```

### 검증 2 — B가 A의 plan 읽기 (T07-C117)

```
요청: GET /api/plans/3507fb5f-b830-4608-a42c-7f9fc3d5e1ef (B 로그인)
응답: 404 {"error":"계획을 찾을 수 없습니다"}
```

### 검증 3 — B가 A의 plan 수정 (T07-C118)

```
요청: PUT /api/plans/3507fb5f-b830-4608-a42c-7f9fc3d5e1ef (B 로그인)
body: {"title":"해킹 시도","periodStart":"2026-01-01",...}
응답: 404 {"error":"계획을 찾을 수 없습니다"}
```

### 검증 4 — B가 A의 plan 삭제 (T07-C119)

```
요청: DELETE /api/plans/3507fb5f-b830-4608-a42c-7f9fc3d5e1ef (B 로그인)
응답: 404 {"error":"계획을 찾을 수 없습니다"}
```

### 검증 5 — 반대 방향: A가 B의 plan (T07-C120)

```
요청 (A 로그인):
  GET    /api/plans/517ab4d8-9571-46a5-870f-0ec662a06ea7
  PUT    /api/plans/517ab4d8-9571-46a5-870f-0ec662a06ea7
  DELETE /api/plans/517ab4d8-9571-46a5-870f-0ec662a06ea7
응답: 404 × 3
```

### 검증 6 — 로그아웃 후 재요청 (T07-C109, C114)

```
로그아웃 → POST /api/auth/logout 실행
  → user.sessionVersion += 1
이후 같은 쿠키로 GET /api/auth/session
  → jwt 콜백이 sessionVersion 불일치 감지 → null 반환
```

### 검증 7 — 로그인 없이 API 직접 요청 (T07-C124)

```
요청: GET /api/plans/<id> (로그아웃 상태)
응답: 401 {"error":"Unauthorized"}
```

### 검증 8 — 목록에 남의 자료 미포함 (T07-C125)

```
B 로그인 상태에서:
  /plans   → B의 plan만
  /tasks   → B의 task만
  /logs    → B의 execution_log만
  /review  → B의 집계만
```

### 검증 9 — 본문에 남의 userId 조작 (T07-C123)

```
요청: POST /api/plans (B 로그인)
body: {"userId":"2281da1a-9166-4792-844d-44f5f658e741","title":"침입 시도",...}
응답: 201 (생성됨)
결과: 계획이 B 소유로 저장됨 (본문의 userId는 무시)
     B의 /plans에서 보이고, A의 /plans에서는 안 보임
```

### 검증 10 — 비밀번호 저장 모습 (T07-C103, C104)

```
계정 A의 저장된 비밀번호:
  DB의 user.password_hash 컬럼에 bcrypt 해시
  예: $2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  (입력한 글자는 보이지 않음)

같은 비밀번호로 만든 두 계정의 해시는 서로 다름 (salt 다름)
```

### 비밀값 가림

이 문서의 모든 검증 기록에서:
- 비밀번호 원문: 미기재
- JWT 토큰: 미기재 (예: `eyJhb...생략` 형태로도 안 씀)
- `AUTH_SECRET`, `DATABASE_URL`의 값: 미기재
- 계정 이메일: 기재 (비밀값 아님)

---

## ⑤ AI와 나

### ⓐ AI에게 맡긴 일

- NextAuth v5 + Drizzle Adapter 보일러플레이트 (`src/auth.ts` 초안)
- 5개 API 라우트에 소유권 검사 패턴 적용 (`loadOwnedPlan()` 헬퍼 등)
- 회원가입/로그인/로그아웃 UI 컴포넌트 초안
- Edge 런타임 오류(`MIDDLEWARE_INVOCATION_FAILED`) 원인 진단 및 `auth.config.ts` 분리 해결책 제시

### ⓑ 내가 직접 판단한 일

- **인증 방식 선택**: NextAuth v5 (라이브러리) vs 직접 구현 vs Lucia 비교 후 NextAuth 선택
- **세션 전략**: DB 세션 → Credentials 제약 발견 후 **JWT + sessionVersion**으로 전환 결정
- **규칙 변경 방향**: 5일 운동 기록에서 "40분 → 30분"으로 낮추는 결정 (2일차 후)
- **관찰 지표**: 하루 운동 시간(분)으로 확정
- **검증 방법**: 계정 2개(A, B)로 양방향 404 테스트 설계

### ⓒ AI 제안을 따르지 않은 일

- **DB 세션 → JWT 전환**: AI가 처음 제안한 DB 세션은 Credentials Provider와 호환되지 않아, AI가 제시한 대안(JWT + sessionVersion)을 채택. 단, "그냥 JWT만 쓰기" 대신 **sessionVersion 검증**을 추가하여 T07-C114를 충족하도록 판단.
- **`.reduce` 오류 진단**: AI가 여러 원인을 제시했으나, 실제 원인은 **Edge 런타임에서의 미들웨어 초기화 실패**였고, 이를 `auth.config.ts` 분리로 해결.
- **날짜 input 달력 아이콘**: Tailwind 클래스와 `globals.css` 두 방법을 **둘 다 적용** (AI는 하나만 권장했으나, 확실성을 위해 병행).

---

## ⑥ 아직 못 막은 것

### 1. 무차별 대입 공격 (Brute Force)

- **현재**: 로그인 시 이메일/비밀번호 검증에 **rate limiting 없음**.
- **위험**: 공격자가 특정 이메일에 대해 수천 개의 비밀번호를 시도할 수 있음. bcrypt cost 10이 1회당 약 100ms 지연을 주지만, 대량 병렬 요청에는 취약.
- **대응 방향**: IP별 또는 계정별 시도 횟수 제한 (예: 5회 실패 시 15분 잠금).

### 2. 비밀번호 재설정

- **현재**: 비밀번호를 잊으면 재설정할 방법이 없음.
- **위험**: 사용자가 계정을 영구히 잃을 수 있음. 또한 "비밀번호 변경 시 sessionVersion 증가" 로직은 구현했지만, 실제 비밀번호 변경 API는 없음.
- **대응 방향**: 이메일 인증 기반 재설정 (NextAuth Email Provider 또는 별도 토큰).

### 3. 2차 인증 (2FA)

- **현재**: 비밀번호 단일 요소 인증.
- **위험**: 비밀번호가 유출되면 계정 전체가 위험.
- **대응 방향**: TOTP (예: `otplib`) 또는 WebAuthn.

### 4. 로그 남기기

- **현재**: 로그인 성공/실패 기록을 DB에 남기지 않음. `console.error`로 서버 로그만.
- **위험**: 침입 시도를 탐지·추적할 수 없음.
- **대응 방향**: `login_attempt` 테이블 또는 외부 로깅 서비스.

### 5. HTTPS 강제 (프로덕션)

- **현재**: Vercel이 HTTPS를 자동 제공하지만, `secure` 쿠키 플래그를 **명시적으로 설정하지 않음**.
- **위험**: 개발/프로덕션 환경 차이로 인한 쿠키 노출 가능성.
- **대응 방향**: `useSecureCookies: process.env.NODE_ENV === 'production'` 명시.

### 6. 정직한 한계

- **"시간이 없어서"**: 위 5가지 중 1~4는 시간 제약으로 구현하지 못했습니다. T07 과제의 핵심(가입·로그인·소유권 검증)은 완성했지만, **실제 프로덕션 수준의 인증**에는 추가 작업이 필요합니다.

---

## 7. 5일 기록 (2026-09-17 ~ 2026-09-21)

### 관찰 지표 정의

| 항목 | 값 |
|------|-----|
| **지표** | 하루 운동 시간 |
| **단위** | 분(minute) |
| **1일차 문장 (C04)** | "유등천 러닝 40분 이상" |
| **주 시작 요일 (C27)** | 월요일 |
| **값 없을 때 (C23)** | 0으로 처리 |
| **값 중복 시 (C24)** | 마지막 값 사용 |
| **음수일 때 (C25)** | 0으로 처리 |
| **반올림 (C26)** | 소수점 버림 |

### 5일 기록

| 일차 | 날짜 (KST) | 계획 규칙 | 실행 시간 (분) | 비고 |
|------|-----------|-----------|----------------|------|
| 1일차 | 2026-09-17 | 40분 이상 | 40 | |
| 2일차 | 2026-09-18 | 40분 이상 | (기록 예정) | |
| 3일차 | 2026-09-19 | **30분 이상** | (기록 예정) | 2일차 뒤 규칙 변경 |
| 4일차 | 2026-09-20 | 30분 이상 | (기록 예정) | |
| 5일차 | 2026-09-21 | 30분 이상 | (기록 예정) | |

**스크린샷**: `docs/screenshots/day1-plan.png` ~ `day5-plan.png`

---

## 8. 계획 규칙 변경 (T07-C09~C15)

### 변경 기록

| 항목 | 값 |
|------|-----|
| **변경 시각** | 2026-09-18 저녁 (2일차 기록 뒤) |
| **변경 전** | 유등천 러닝 **40분 이상** |
| **변경 후** | 유등천 러닝 **30분 이상** |
| **변경 이유** | "40분은 초반에 부담이라 30분으로 낮춤" |
| **비교 기준** | 같은 지표(하루 운동 시간), 같은 단위(분), 같은 계산 규칙 |

### 전후 비교

| 구분 | 1~2일차 (40분 기준) | 3~5일차 (30분 기준) |
|------|--------------------|--------------------|
| 지표 | 하루 운동 시간 | 하루 운동 시간 |
| 단위 | 분 | 분 |
| 계산 규칙 | 동일 (C23~C27) | 동일 |

**주의**: 규칙 변경 기록은 **2일차 뒤, 3일차 앞**에 위치합니다. (T07-C09)

---

## 9. 화면 합계 vs 손 계산 (T07-C132)

5일 기록 완료 후 채웁니다.

| 항목 | 화면 표시 | 손 계산 | 일치 |
|------|-----------|---------|------|
| 총 실행 시간 | (5일 후) | (5일 후) | (5일 후) |
| 평균 | (5일 후) | (5일 후) | (5일 후) |

---

## 10. 내보내기 및 계정 삭제 (T07-C133, C134)

### 내보내기
- `/review` 페이지의 "JSON 내보내기" 버튼
- 내 계획·할 일·실행 기록 전체를 JSON 1파일로 다운로드

### 계정 삭제 안내
- (구현 후 화면에 안내 문구 추가)

---

## 11. 확인 방법 (4줄 요약)

1. **어디로 가나요**: https://sktassign7-auth.vercel.app
2. **세 단계 안에 무엇을 하나요**: ① 회원가입 → ② 로그인 → ③ "내 계획 보기" 클릭
3. **무엇이 보이면 통과인가요**: 로그인 후 내 계획 목록이 보이고, 로그아웃 후 다시 접속하면 로그인 화면으로 돌아감
4. **안 될 때는 무엇이 보이나요**: 로그인 실패 시 "이메일 또는 비밀번호가 올바르지 않습니다" / 남의 자료 접근 시 404

---

**작성일**: 2026-09-17
**최종 갱신**: (5일 후)