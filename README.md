# 플랜두씨 다이어리 1

계획(Plan) → 실제로 한 일(Do) → 돌아보기(See)가 하나로 이어지는 다이어리 앱.

> **과제 6** — 과정 최대 과제 (계획 8~10h)
> 로그인 없음. 서버 DB 영속. 링크 아는 사람 누구나 열람 가능.

---

## 목차

1. [무엇을 하는 앱인가](#무엇을-하는-앱인가)
2. [주요 기능](#주요-기능)
3. [기술 스택](#기술-스택)
4. [디렉터리 구조](#디렉터리-구조)
5. [데이터 모델](#데이터-모델)
6. [집계 정의](#집계-정의)
7. [로컬 실행](#로컬-실행)
8. [검증](#검증)

---

## 무엇을 하는 앱인가

할 일에 체크만 하고 끝나는 도구가 아니다. **내가 계획을 어느 쪽으로 자주 틀리는지 눈으로 보게 만드는 도구**다.

- 계획을 세우고 (기간·우선순위·성공 기준·예상 시간)
- 계획을 고쳐도 **고치기 전 계획이 남는다** (수정 이력)
- 계획 아래 세부 할 일을 만들고
- 실제로 언제 시작해서 얼마나 걸렸고 어디서 막혔는지 기록하고
- 돌아보기에서 **예상과 실제의 차이**를 근거 기록과 함께 보고
- 고칠 점 한 가지를 **다음 계획으로 넘긴다**

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
- 첫 화면에 **로그인 없음 안내**

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
| 검증 | Zod |
| 시간 | date-fns-tz (Asia/Seoul) |
| 테스트 | Vitest |
| 배포 | Vercel |

---

## 디렉터리 구조

```
sktassign6_plandosee/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # 첫 화면 (C82 안내 배너)
│   │   ├── layout.tsx
│   │   ├── plans/              # 계획 목록/상세/생성
│   │   ├── tasks/              # 필터된 할 일 목록
│   │   ├── logs/               # 실행 기록 목록
│   │   ├── review/             # 돌아보기 집계
│   │   └── api/                # API 라우트
│   ├── components/
│   │   ├── ui/                 # shadcn 컴포넌트
│   │   └── domain/             # 도메인 컴포넌트
│   ├── db/
│   │   ├── index.ts            # Drizzle 연결 (Neon)
│   │   └── schema.ts           # 5개 테이블 정의 (진실 공급원)
│   └── lib/
│       ├── aggregate.ts        # 집계 함수 (C28~C32)
│       ├── time.ts             # KST 유틸
│       ├── validate.ts         # Zod 스키마
│       └── export.ts           # JSON 내보내기
├── contracts/
│   └── pds-schema-v2.json      # 스키마 문서 (자동 생성)
├── tests/
│   ├── aggregate.test.ts       # C28~C32
│   ├── idempotency.test.ts     # C21
│   └── kst-boundary.test.ts    # C30 KST 경계
├── scripts/
│   └── gen-schema-json.ts      # 스키마 JSON 생성
├── .env.local                  # DATABASE_URL (Git 제외)
├── .env.example                # 키 이름만
├── drizzle.config.ts
├── package.json
├── README.md
├── submission-note.md
└── submission-checklist.md
```

---

## 데이터 모델

5개 테이블:

| 테이블 | 역할 |
|--------|------|
| `plan` | 계획 |
| `plan_revision` | 계획 수정 이력 (snapshot jsonb + changedFields) |
| `task` | 할 일 (`completedAt`이 완료의 진실, `deletedAt`은 soft delete) |
| `execution_log` | 실행 기록 (시작/종료/소요/막힘) |
| `review_note` | 돌아보기 → 다음 계획 (고칠 점) |

**폐기:** `Completion` 테이블, `Task.status` 컬럼 → `Task.completedAt` 하나로 통합.

스키마 문서: `contracts/pds-schema-v2.json` (자동 생성)

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

---

## 로컬 실행

### 요구사항

- Node.js 18.18 이상 (개발 환경: v24.21.0)
- Neon Postgres 프로젝트 (또는 다른 Postgres)

### 설정

1. **저장소 클론**

```bash
git clone <repo-url>
cd sktassign6_plandosee
```

2. **의존성 설치**

```bash
npm install
```

3. **환경변수**

`.env.local` 파일 생성:

```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

(Neon 대시보드의 Connection string, `-pooler` 호스트)

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
| `npm test` | Vitest (24개 테스트) |
| `npm run gen:schema` | `contracts/pds-schema-v2.json` 재생성 |

---

## 검증

### 자동 테스트

```bash
npm test
```

- `aggregate.test.ts` (15): C28~C32 모든 케이스
- `idempotency.test.ts` (3): C21 조건부 UPDATE
- `kst-boundary.test.ts` (6): C30 KST 경계
- **총 24개**

### 수동 검증 (스크립트)

```bash
npm run db:studio   # DB GUI에서 5개 테이블 확인
```

### 배포 URL

**결과물:** (Vercel 배포 후 기입)

**소스:** (GitHub commit URL 기입)

---

## 로그인 없음 안내

**지금은 로그인이 없어 링크를 아는 사람은 누구나 볼 수 있습니다. 남이 봐도 괜찮은 내용만 넣으세요.**

로그인과 접근 제한(잠그는 일)은 7번 과제에서 다룹니다.