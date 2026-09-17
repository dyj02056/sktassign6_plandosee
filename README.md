# 플랜두씨 다이어리 2

계획(Plan) → 실제로 한 일(Do) → 돌아보기(See)가 하나로 이어지는 다이어리 앱.

> **과제 7** — 플랜두씨 다이어리 2: 인증을 붙이고, 어떻게 붙였는지 설명하기
> 로그인 있음. 서버 DB 영속. 내 기록은 로그인 뒤에만 보임.
>
> **T06(과제 6) 이어받음**: main 브랜치의 최종 commit `beb39fa9e42657b6b57b35cf5bd4cbd5ff7b3d3e`을 조상으로 하는 `t07-auth` 브랜치에서 인증을 추가했습니다.

---

## 목차

1. [무엇을 하는 앱인가](#무엇을-하는-앱인가)
2. [주요 기능](#주요-기능)
3. [인증 (T07에서 추가)](#인증-t07에서-추가)
4. [기술 스택](#기술-스택)
5. [디렉터리 구조](#디렉터리-구조)
6. [데이터 모델](#데이터-모델)
7. [집계 정의](#집계-정의)
8. [로컬 실행](#로컬-실행)
9. [검증](#검증)

---

## 무엇을 하는 앱인가

할 일에 체크만 하고 끝나는 도구가 아니다. **내가 계획을 어느 쪽으로 자주 틀리는지 눈으로 보게 만드는 도구**다.

- 계획을 세우고 (기간·우선순위·성공 기준·예상 시간)
- 계획을 고쳐도 **고치기 전 계획이 남는다** (수정 이력)
- 계획 아래 세부 할 일을 만들고
- 실제로 언제 시작해서 얼마나 걸렸고 어디서 막혔는지 기록하고
- 돌아보기에서 **예상과 실제의 차이**를 근거 기록과 함께 보고
- 고칠 점 한 가지를 **다음 계획으로 넘긴다**

**T07부터**: 내 기록은 **로그인한 나만** 볼 수 있다.

---

## 주요 기능

### 카드 1 — 계획 세우기

- 계획에 **기간·우선순위·성공 기준·예상 시간** 저장
- 계획을 수정해도 **수정 직전 상태가 PlanRevision에 남음** (snapshot + changedFields)
- 계획 상세에서 **인라인 수정** + **"수정 이력" 탭**

### 카드 2 — 실제 기록하기

- 계획 아래 **세부 할 일** 등록 (마감일, 예상 시간)
- 각 할 일에 **실행 기록** (시작·종료·소요 시간·막힌 이유)
- 한 할 일에 실행 기록 **여러 개** 정상

### 카드 3 — 실제로 한 일 적기

- 실행 기록에 **시작 시각·끝난 시각·실제 걸린 시간·막혔던 이유** 저장
- 완료 처리는 **DB 차원에서 멱등** (두 번 눌러도 완료 1건)
- 실행 기록 저장이 **원래 계획 값을 덮어쓰지 않음**

### 카드 4 — 돌아보기, 그리고 다음 계획으로

- 기간별 **계획 수·완료 수·지연 수·막힘 수**
- **예상 시간·실제 시간·차이**
- 집계 숫자를 **누르면 그 숫자가 나온 기록으로 이동**
- **고칠 점 한 건**을 저장 (다음 계획으로)

### 카드 5 — 내 것으로 채우고, 잃지 않게

- 내 계획·할 일·실행 기록이 실제로 들어 있음
- 새로고침해도 **DB에서 그대로 복원**
- **내 자료 전체를 JSON 1파일로 내보내기**
- **T07**: 로그인한 내 기록만 조회·수정·삭제 가능

---

## 인증 (T07에서 추가)

### 무엇으로 붙였나

| 계층 | 선택 | 버전 |
|------|------|------|
| 인증 프레임워크 | **NextAuth (Auth.js) v5** | `5.0.0-beta.32` |
| DB 어댑터 | `@auth/drizzle-adapter` | `1.11.3` |
| 비밀번호 해싱 | **bcryptjs** | `3.0.3` (cost 10) |
| 세션 방식 | **JWT** + `sessionVersion` 검증 | — |
| 세션 만료 | 7일 | — |

### 왜 이걸 골랐나

- **NextAuth v5**: Next.js 16 App Router에 최적. 가입·로그인·CSRF 보호를 라이브러리가 처리.
- **JWT + sessionVersion**: Credentials Provider는 DB 세션과 함께 쓸 수 없어 JWT 선택. `user.sessionVersion`을 매 요청마다 DB와 비교하여 로그아웃/비밀번호 변경 시 이전 토큰을 무효화.
- **bcryptjs**: 널리 쓰이는 해싱 라이브러리. cost 10은 서버리스 환경에서 응답 시간과 보안의 균형점.
- **함께 검토했지만 고르지 않은 것**: DB 세션(Credentials 제약), 직접 구현(보안 위험 + 시간), Lucia(유지보수 모드).

### 흐름

**가입**: `/signup` → `POST /api/auth/signup` → Zod 검증 → 중복 확인 → `bcrypt.hash` → `user` INSERT → `/login`

**로그인**: `/login` → `signIn('credentials')` → `authorize()` → `bcrypt.compare` → JWT 발급 (쿠키 `authjs.session-token`) → `/`

**로그아웃**: `LogoutButton` → `POST /api/auth/logout` (sessionVersion += 1) → `signOut()` → `/login`

**보호 경로**: `middleware.ts` → `auth.config.ts`의 `authorized` 콜백 → 미로그인 시 `/login` 리다이렉트

### 거절 정책

| 상황 | 응답 |
|------|------|
| 로그인 없이 보호 경로 | `/login`으로 리다이렉트 |
| 로그인 없이 API 호출 | `401 {"error":"Unauthorized"}` |
| 남의 자료 접근 (읽기/수정/삭제) | `404 {"error":"계획을 찾을 수 없습니다"}` |
| 목록 조회 | 본인 것만 반환 (`eq(userId)` 필터) |

---

## 기술 스택

| 계층 | 선택 |
|------|------|
| 프레임워크 | Next.js 16 (App Router, RSC) |
| 언어 | TypeScript |
| 스타일 | Tailwind v4 |
| UI | shadcn/ui (Radix UI + Lyra 프리셋 + Phosphor) |
| DB | Neon Postgres |
| 드라이버 | @neondatabase/serverless |
| ORM | Drizzle |
| **인증** | **NextAuth (Auth.js) v5 + @auth/drizzle-adapter + bcryptjs** |
| 검증 | Zod |
| 시간 | date-fns-tz (Asia/Seoul) |
| 테스트 | Vitest |
| 배포 | Vercel |

---

## 디렉터리 구조

```
sktassign6_plandosee/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # 루트 (로그인 여부 분기)
│   │   ├── layout.tsx
│   │   ├── login/page.tsx           # 로그인
│   │   ├── signup/page.tsx          # 회원가입
│   │   ├── plans/                   # 계획 목록/상세/생성
│   │   ├── tasks/                   # 필터된 할 일 목록
│   │   ├── logs/                    # 실행 기록 목록
│   │   ├── review/                  # 돌아보기 집계
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── [...nextauth]/route.ts   # NextAuth 핸들러
│   │       │   ├── signup/route.ts          # 회원가입
│   │       │   └── logout/route.ts          # 로그아웃 (sessionVersion++)
│   │       ├── plans/route.ts
│   │       ├── plans/[id]/route.ts          # loadOwnedPlan()
│   │       ├── tasks/route.ts
│   │       ├── executions/route.ts
│   │       └── review/notes/route.ts
│   ├── components/
│   │   ├── ui/                      # shadcn 컴포넌트
│   │   └── domain/                  # 도메인 컴포넌트
│   │       ├── HomeLogin.tsx        # 로그인 UI
│   │       ├── HomeDashboard.tsx    # 로그인 후 홈
│   │       └── LogoutButton.tsx
│   ├── db/
│   │   ├── index.ts                 # Drizzle 연결 (Neon)
│   │   └── schema.ts                # 9개 테이블 (기존 5 + 인증 4)
│   ├── lib/
│   │   ├── aggregate.ts
│   │   ├── time.ts
│   │   ├── validate.ts
│   │   └── export.ts
│   ├── types/
│   │   └── next-auth.d.ts           # Session 타입 확장
│   ├── auth.config.ts               # Edge 안전 경량 설정 (미들웨어용)
│   ├── auth.ts                      # NextAuth 전체 설정
│   └── middleware.ts                # 보호 경로 리다이렉트
├── contracts/
│   └── pds-schema-v2.json
├── docs/
│   └── screenshots/                 # 5일 기록 스크린샷
├── tests/
│   ├── aggregate.test.ts
│   ├── idempotency.test.ts
│   └── kst-boundary.test.ts
├── scripts/
│   └── gen-schema-json.ts
├── .env.local                       # DATABASE_URL, AUTH_SECRET (Git 제외)
├── .env.example
├── drizzle.config.ts
├── package.json
├── README.md
├── submission-note.md
├── submission-checklist.md
└── structure.md
```

---

## 데이터 모델

### 인증 테이블 (T07 추가, 4개)

| 테이블 | 역할 |
|--------|------|
| `user` | 계정 (id, email unique, passwordHash, sessionVersion, ...) |
| `session` | DB 세션 (JWT 사용으로 미사용이지만 Adapter가 요구) |
| `account` | OAuth용 (Adapter 요구) |
| `verification_token` | 이메일 인증용 (Adapter 요구) |

### 도메인 테이블 (기존 5개, T07에서 `user_id` 추가)

| 테이블 | 역할 | T07 변경 |
|--------|------|----------|
| `plan` | 계획 | `user_id` 추가 (FK, index) |
| `plan_revision` | 계획 수정 이력 | `user_id` 추가 |
| `task` | 할 일 | `user_id` 추가 |
| `execution_log` | 실행 기록 | `user_id` 추가 |
| `review_note` | 돌아보기 → 다음 계획 | `user_id` 추가 |

**폐기**: `Completion` 테이블, `Task.status` 컬럼 → `Task.completedAt` 하나로 통합.

스키마 문서: `contracts/pds-schema-v2.json`

---

## 집계 정의

T06-C28~C32 (구현: `src/lib/aggregate.ts`, 테스트: `tests/aggregate.test.ts`)

| 집계 | 정의 |
|------|------|
| 계획 수 | `COUNT(task WHERE deletedAt IS NULL)` |
| 완료 수 | `COUNT(task WHERE deletedAt IS NULL AND completedAt IS NOT NULL)` |
| 지연 수 | `COUNT(task WHERE deletedAt IS NULL AND completedAt IS NULL AND dueAt < today_kst)` |
| 막힘 수 | 막힌 이유가 하나라도 있는 **Task** 수 (Task 기준, 중복 제거) |
| 예상 시간 | 대상 Task의 `estimatedMinutes` 합 |
| 실제 시간 | 대상 Task의 `execution_log.durationMinutes` 합 |
| 차이 | 실제 − 예상 (Task 0개면 0) |

**"오늘"은 요청 시점의 KST 날짜** (Asia/Seoul). 자정을 넘기면 지연 수가 바뀐다.

**T07부터**: 모든 집계는 **내 것만** 대상 (`user_id` 필터).

---

## 로컬 실행

### 요구사항

- Node.js 18.18 이상 (개발 환경: v24.21.0)
- Neon Postgres 프로젝트
- `.env.local`에 `DATABASE_URL`, `AUTH_SECRET`

### 설정

1. **저장소 클론** (또는 fork)

```bash
git clone https://github.com/dyj02056/sktassign6_plandosee
cd sktassign6_plandosee
git checkout t07-auth
```

2. **의존성 설치**

```bash
npm install
```

3. **환경변수** (`.env.local` 생성)

```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
AUTH_SECRET=<32바이트 랜덤 문자열>
```

- `AUTH_SECRET` 생성 (PowerShell):
  ```powershell
  [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
  ```

4. **DB 마이그레이션**

```bash
npm run db:push
```

5. **개발 서버**

```bash
npm run dev
```

`http://localhost:3000`

### 스크립트

| 명령 | 용도 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run db:push` | 스키마를 DB에 반영 |
| `npm run db:studio` | Drizzle Studio (DB GUI) |
| `npm test` | Vitest |
| `npm run gen:schema` | `contracts/pds-schema-v2.json` 재생성 |

---

## 검증

### 자동 테스트

```bash
npm test
```

- `aggregate.test.ts` (15): C28~C32
- `idempotency.test.ts` (3): C21
- `kst-boundary.test.ts` (6): C30 KST 경계

### 인증 검증 (수동)

자세한 기록은 **`submission-note.md` ④** 참고.

| 검증 | 결과 |
|------|------|
| 로그인 없이 `/plans` → `/login` 리다이렉트 | ✅ |
| B가 A의 plan 읽기 | 404 |
| B가 A의 plan 수정 | 404 |
| B가 A의 plan 삭제 | 404 |
| A가 B의 plan (반대) | 404 × 3 |
| 로그인 없이 API 직접 호출 | 401 |
| 목록에 남의 자료 | 미포함 |
| 본문에 남의 userId 조작 | 내 소유로 저장 |

### 배포 URL

**결과물**: https://sktassign7-auth.vercel.app

**소스**: https://github.com/dyj02056/sktassign6_plandosee/commit/`<T07-최종-SHA>`

**T06 조상 commit**: `beb39fa9e42657b6b57b35cf5bd4cbd5ff7b3d3e`

---

## 보안 한계 (T07-C130)

자세한 내용은 `submission-note.md` ⑥ 참고.

- 무차별 대입 (rate limiting 없음)
- 비밀번호 재설정 미구현
- 2차 인증 미구현
- 로그인 시도 로그 미기록
- `secure` 쿠키 플래그 명시 안 함 (Vercel이 HTTPS 제공하지만)

---

## T06 이력 안내

이 저장소는 **T06(과제 6)**의 이어받기입니다.

- **T06 최종 commit**: `beb39fa9e42657b6b57b35cf5bd4cbd5ff7b3d3e` (main 브랜치)
- **T07 작업 브랜치**: `t07-auth`
- **T06 제출물 URL**: (6번 Vercel URL, 유지)
- **T07 제출물 URL**: https://sktassign7-auth.vercel.app (신규)