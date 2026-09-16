# Submission Note — 과제 6: 플랜두씨 다이어리 1

> 이 문서는 과제 6을 진행한 **모든 과정**을 누적 기록한다.
> 설계 결정(grilling), 기술 스택, 셋업, 구현 진행을 시간순으로 남긴다.

---

## 1. 과제 개요

**과제 6 — 플랜두씨 다이어리 1: 내 계획과 실제를 담는 앱**

- 계획(Plan) → 실제로 한 일(Do) → 돌아보기(See)가 하나로 이어지는 다이어리
- 로그인 없음 (7과제에서 추가 예정)
- 서버 DB 영속 (새로고침해도 유지)
- 링크 아는 사람 누구나 열람 가능 → 남이 봐도 괜찮은 내용만
- 예상 시간: 8~10h

---

## 2. 설계 결정 — Grilling (Q1~Q9)

`grill-me` 스킬의 정신(계획을 집요하게 찌르는 인터뷰)에 따라, 설계를 확정하기 전에 9개 라운드로 캐물었다.

### Q1. "오늘"의 정의

- **확정:** 요청 시점의 **KST(Asia/Seoul) 날짜**
- 자정을 넘기면 지연 수가 바뀐다 (의도된 동작)
- 테스트는 KST 경계 고정

### Q2. "아무것도 없으면 0"의 범위

- **확정:** **Task가 0개일 때만** 0
- Task는 있는데 ExecutionLog가 0개면: 예상 90, 실제 0, **차이 −90** (산술 유지)
- 근거: T06-C32 "차이는 실제 − 예상"이라는 문구 유지. 과제 취지("계획을 어느 쪽으로 틀리는지")에 부합

### Q3. 막힘 수의 기준

- **확정:** **Task 기준** (막힌 이유가 하나라도 적힌 Task의 개수)
- 한 Task에 막힘 기록 2개여도 **1**
- 근거: T06-C31 "막힌 이유가 하나라도 적힌 할 일 수"

### Q4. PlanRevision의 스냅샷 방식

- **확정:** 절충안 — **snapshot(jsonb) + changed_fields(text[])**
- snapshot: 수정 직전 Plan 전체 (C08 증명)
- changed_fields: 실제 비교로 채운 바뀐 필드 이름 (화면 강조용)
- 근거: C08 "고치기 전 계획이 그대로 남아 있다" + 화면에서 "무엇이 바뀌었나" 표시 가능

### Q5. 완료 멱등

- **확정:** `Task.completed_at` **조건부 UPDATE** (`WHERE completed_at IS NULL`)
- DB 차원 보장, 200 OK + 현재 Task 상태 반환
- `idempotency_key` 미도입 (과제 규모에 과함)
- **참고:** 원래 `Completion.task_id` unique로 정했다가, Q6에서 `Task.completed_at`으로 **구현 지점 이동**. 의도(멱등, DB 보장, 200 OK)는 100% 보존

### Q6. 완료 상태의 진실 공급원

- **확정:** `Task.completed_at` **단 한 곳**
- 폐기: `Completion` 테이블, `Task.status` 컬럼
- 완료 판정: `completed_at IS NULL` = 미완료 / `IS NOT NULL` = 완료
- 근거: 완료는 본질적으로 하나. 두 곳에 두면 불일치 관리 비용 발생
- **카드3 "기록 1건" 해석:** 완료 사건 1건 = `completed_at` 1개

### Q7. 계획 수정 UI

- **확정:**
  - Q7-a: **(a) 인라인 수정** (`/plans/[id]`에서 바로)
  - Q7-b: **(iii) 탭** (`현재 계획` / `수정 이력`)
  - Q7-c: 6단계 확인 절차를 `submission-checklist.md`에 명시
- **확장 (P4-7):** 탭을 3개로 (현재 계획 / 수정 이력 / **돌아보기**). "돌아보기" 탭에서 C33(고칠 점 → 다음 계획) 입력

### Q8. 집계 → 근거 이동 (C83)

- **확정:**
  - Q8-a: **(a) `/tasks?filter=...`**
  - Q8-b: 예상 시간 → `/tasks?plan=[id]&filter=all`, 실제 시간 → `/logs?plan=[id]` (신규 페이지), 차이 → 실제 시간으로 연결
  - Q8-c: 막힘 수 → Task 목록 + 각 Task의 막힌 이유들 표시
- 필터: `active`, `done`, `overdue`, `blocked`, `all`

### Q9. 내보내기 / 첫 화면 안내 / 스키마 JSON

- **확정:**
  - Q9-a: **(a) JSON 내보내기**, 진입점은 첫 화면 + 돌아보기 양쪽, 파일명 `plandussi-export-YYYY-MM-DD.json`
  - Q9-b: **(a) 문구 그대로**, 첫 화면 상단 배너 (C82)
  - Q9-c: **(b) 자동 생성** (`scripts/gen-schema-json.ts`), 집계 정의 포함

---

## 3. 기술 스택 (확정)

| 계층 | 선택 |
|------|------|
| 프레임워크 | Next.js 최신 (16.3.5, App Router, RSC) |
| 언어 | TypeScript |
| 스타일 | Tailwind v4 |
| UI 프리미티브 | shadcn/ui (Radix UI + Lyra 프리셋 + Phosphor) |
| 아이콘 | @phosphor-icons/react |
| 애니메이션 | motion (`motion/react`) |
| DB | **Neon Postgres** (Supabase 무료 플랜 한도 2개 문제로 전환) |
| 드라이버 | @neondatabase/serverless |
| ORM | Drizzle |
| 검증 | Zod |
| 타임존 | date-fns-tz (Asia/Seoul) |
| 테스트 | Vitest |
| 배포 | Vercel |
| 패키지 매니저 | npm |

**DB 호스팅 변경 이력:**
- 처음엔 Supabase Postgres로 정했으나, 무료 플랜 프로젝트 한도(2개)에 걸림
- **Neon으로 전환** (프로젝트 수 무제한, Vercel 공식 통합, 서버리스 최적화)

---

## 4. 스키마 (5 테이블)

```
Plan          — 계획 (id, title, period_start, period_end, priority, success_criteria, estimated_minutes, created_at, updated_at, deleted_at)
PlanRevision  — 수정 이력 (id, plan_id, snapshot jsonb, changed_fields text[], revised_at)
Task          — 할 일 (id, plan_id, title, due_at, estimated_minutes, deleted_at, completed_at, created_at)
ExecutionLog  — 실행 기록 (id, task_id, started_at, ended_at, duration_minutes, blocked_reason)
ReviewNote    — 돌아보기→다음 계획 (id, plan_id, fix_note, carried_to_plan_id)
```

**폐기:** `Completion` 테이블, `Task.status` 컬럼 (Q6)

**enum:** `priority` (low | medium | high)

**P5-1.6 추가:** `Plan.deletedAt` (soft delete, cascade soft delete로 Task도 함께)

---

## 5. 디렉터리 구조

```
sktassign6_plandosee/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # 첫 화면 (C82 안내 배너)
│   │   ├── layout.tsx          # 다크 고정
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

## 6. 진행 과정 (Step by Step)

### P0 — Grilling (완료)

Q1~Q9 확정. 위 2절 참조.

### P0.5 — 프로젝트 셋업 (완료)

| Step | 내용 | 결과 |
|------|------|------|
| Step 0 | 현재 상태 확인 | Windows, Node v24.21.0, GitHub 연동됨 |
| Step 1 | Next.js 생성 (`tmp-next`) | Next.js 16.3.5 |
| Step 2 | 복사 + 정리 | `tmp-next` → `sktassign6_plandosee` |
| Step 3 | 의존성 설치 | drizzle-orm, postgres, zod, date-fns-tz, motion, @phosphor-icons/react + 개발: drizzle-kit, vitest, tsx, @types/node@24 |
| Step 4 | shadcn + 폴더 구조 | Radix UI + Lyra + Phosphor, `src/` 기준 구조 |
| Step 5 | `.env.local` + Neon | Neon Postgres로 전환 |
| Step 6 | Drizzle 설정 + `db:push` | 5 테이블 생성 확인 (Drizzle Studio) |

**의존성 충돌 해결:**
- vitest 5.x가 `@types/node@22+` 요구 → `@types/node@24`로 올려 해결

**shadcn 프리셋 선택:**
- Base UI 대신 **Radix UI** (기존 표준, 생태계 성숙)
- 프리셋 **Lyra** (Phosphor + JetBrains Mono, Operate 모드에 적합)

**DB 전환:**
- Supabase 무료 플랜 한도 2개 문제 → **Neon으로 전환**
- `@neondatabase/serverless` 드라이버 사용

### P1 — 카드 1: 계획 세우기 (완료 ✅)

| 작업 | 상태 |
|------|------|
| P1 스키마 정의 (`src/db/schema.ts`) | ✅ |
| DB 반영 (`db:push`, Neon) | ✅ |
| P1-1: `src/lib/validate.ts` (Zod) | ✅ |
| P1-2: `src/lib/time.ts` (KST) | ✅ |
| P1-3: `src/app/api/plans/route.ts` (GET/POST) | ✅ |
| P1-4: `src/app/api/plans/[id]/route.ts` (GET/PUT) | ✅ |
| P1-4: `src/app/api/plans/[id]/revisions/route.ts` (GET) | ✅ |
| P1-5: `src/app/plans/page.tsx` (목록 화면) | ✅ |
| P1-6: `src/app/plans/[id]/page.tsx` (인라인 수정 + 탭, Q7) | ✅ |
| P1-6: `src/components/domain/{PlanForm,PlanTabs,RevisionList}.tsx` | ✅ |
| P1-6: `src/app/plans/new/page.tsx` (새 계획 생성) | ✅ |

**검증 완료:**
- `POST /api/plans` → 201 Created, 한글 정상, KST 저장
- `GET /api/plans` → 목록 반환
- `PUT /api/plans/[id]` → Plan 수정 + PlanRevision 생성
  - **T06-C08 증명:** snapshot에 수정 전 값("주 3회 운동", 90분) 그대로 남음
  - changedFields: `["title","successCriteria","estimatedMinutes"]` (실제 비교로 채움)
  - Plan ID 불변
- 변경 없이 PUT → `revisionCreated: false` (불필요한 이력 안 쌓임)
- `/plans` 화면: 카드(제목, 기간, 우선순위, 예상 시간) 표시, 클릭 시 이동
- `/plans/[id]`: 탭(현재 계획 / 수정 이력), 인라인 수정 폼, 리비전 카드 표시
- `/plans/new`: 새 계획 생성 → 성공 시 상세로 이동

### P2 — 카드 2: 실제 기록하기 (완료 ✅)

**목표:** T06-C09~C11

| 작업 | 상태 |
|------|------|
| P2-1: `src/lib/validate.ts` 확장 (Task/Execution Zod) | ✅ |
| P2-2: `src/app/api/tasks/route.ts` (GET/POST) | ✅ |
| P2-3: `src/app/api/tasks/[id]/route.ts` (GET/PUT/DELETE soft) | ✅ |
| P2-4: `src/app/api/executions/route.ts` (GET/POST) | ✅ |
| P2-5: `src/components/domain/TaskForm.tsx` | ✅ |
| P2-6: `src/components/domain/ExecutionForm.tsx` | ✅ |
| P2-7: `src/components/domain/TaskItem.tsx` | ✅ |
| P2-8: `src/components/domain/TaskList.tsx` | ✅ |
| P2-9: `src/app/plans/[id]/page.tsx` 확장 (할 일 섹션) | ✅ |

**검증 완료 (API + 화면):**
- `POST /api/tasks` → 201 Created
- `GET /api/tasks?planId=` → 목록 (deletedAt IS NULL 필터)
- `POST /api/executions` (정상/막힘) → 저장, 한글 정상
- `GET /api/executions?taskId=` → startedAt 내림차순
- 시간 저장 검증: `+09:00` → UTC 정규화 정확
- **화면:** 할 일 + 실행 기록 표시, 소요 시간 자동 계산, 새로고침 후 유지 (C11 증명)

**통과 기준:**
- **T06-C09** 계획 아래 할 일 등록 ✅
- **T06-C10** 실제 수행 시각/소요 시간 저장 ✅
- **T06-C11** 실행 기록 DB 영속 (새로고침 후 유지) ✅

**설계 결정 기록:**
- **soft delete:** Task 삭제는 `deletedAt` 설정. 목록/집계는 `deletedAt IS NULL`만 봄 (C28과 일관)
- **`isoDateString` 헬퍼:** `z.string().datetime()`이 `+09:00` 오프셋 거부 → `Date` 파싱 가능한 모든 ISO 형식 허용
- **실행 기록은 여러 개 정상:** unique 제약 없음 (Q5 재기록)
- **`planId`는 Task 수정 대상 아님**
- **N+1 회피:** TaskList에서 `inArray`로 실행 기록을 한 번에 로드

### P3 — 카드 3: 실제로 한 일 적기 (완료 ✅, C22는 P4에서)

**목표:** T06-C21, C22, C23~C27

| 작업 | 상태 |
|------|------|
| P3-1: `src/app/api/tasks/[id]/complete/route.ts` (조건부 UPDATE) | ✅ |
| P3-2: `src/components/domain/CompleteButton.tsx` | ✅ |
| P3-3: `src/components/domain/TaskItem.tsx` 수정 (완료 버튼 삽입) | ✅ |
| P3-4: C21 멱등 테스트 | ✅ |
| P3-5: C27 검증 | ✅ |

**검증 완료:**
- **T06-C21:** API 직접 두 번 호출 → 둘 다 200 OK, `completedAt` 첫 번째 시각 그대로 (덮어쓰지 않음)
  - 조건부 UPDATE: `WHERE id = ? AND completed_at IS NULL`
  - 두 번째 요청은 0행 변경 → 멱등
- **T06-C23~C26:** P2에서 이미 검증 (실행 기록 4개 필드 저장)
- **T06-C27:** Plan 조회 → 실행 기록 추가 → Plan 재조회 → 값 완전 동일 (updatedAt 포함)
- **T06-C22:** P4(돌아보기)에서 검증

**설계 결정 기록:**
- **완료 멱등의 보장 지점:** 서버의 조건부 UPDATE. 버튼 잠금은 UX일 뿐 (카드3 "버튼 잠금만으로는 불통과" 준수)
- **UUID 형식 검증 추가:** 무효한 UUID가 오면 400 반환 (500 아님). `complete/route.ts`에 정규식 검증
- **첫 500 에러의 정체:** 템플릿 문구 `여기에_TASK_ID`를 실제 ID로 안 바꾼 잘못된 명령이 원인. API 자체는 정상

### P4 — 카드 4: 돌아보기, 그리고 다음 계획으로 (완료 ✅)

**목표:** C28~C33, C83, C22

| 작업 | 상태 |
|------|------|
| P4-1: `src/lib/aggregate.ts` (집계 함수) | ✅ |
| P4-2: `tests/aggregate.test.ts`, `idempotency.test.ts`, `kst-boundary.test.ts` | ✅ 24/24 통과 |
| P4-2: `vitest.config.ts` | ✅ |
| P4-3: `src/app/api/review/route.ts` (집계 API) | ✅ |
| P4-4: `src/app/review/page.tsx` + `AggregateGrid.tsx` | ✅ |
| P4-5: `src/app/tasks/page.tsx` (필터 수신, C83) | ✅ |
| P4-6: `src/app/logs/page.tsx` (실행 기록 목록, C83) | ✅ |
| P4-7: `src/app/api/review/notes/route.ts` (고칠 점 API) | ✅ |
| P4-7: `ReviewNoteForm.tsx`, `ReviewNoteList.tsx`, `ReviewTab.tsx` | ✅ |
| P4-7: `PlanTabs.tsx` 확장 (3번째 탭 "돌아보기", Q7 확장) | ✅ |
| P4-7: `src/app/plans/[id]/page.tsx` 수정 (reviewContent) | ✅ |

**검증 완료:**
- `/api/review?planId=...` → `{planCount:4, doneCount:4, overdueCount:0, blockedCount:1, estimatedMinutes:37, actualMinutes:65, diffMinutes:28}` (산술 일치)
- `/review` 화면: 집계 카드 7개 (계획/완료/지연/막힘/예상/실제/차이), 값 일치
- 카드 클릭 → `/tasks?filter=active|done|overdue|blocked|all` 또는 `/logs` 이동
- `/logs`: 실행 기록 3건, 총 65분 (실제 시간과 일치)
- `/plans/[id]` "돌아보기" 탭: 이 계획 집계 + 고칠 점 입력/저장/새로고침 유지 (C33)

**통과 기준:**
- **T06-C28~C32** ✅ (테스트 24개로 고정)
- **T06-C83** ✅ (7개 카드 전부 이동)
- **T06-C33** ✅ (고칠 점 저장 + 새로고침 유지)
- **T06-C22** ✅ (P3 이월, 완료 수 정확히 셈)

**설계 결정 기록:**
- **Q7 확장:** `/plans/[id]` 탭을 2개 → **3개**로 (현재 계획 / 수정 이력 / 돌아보기)
- **C33 위치:** `/plans/[id]`의 "돌아보기" 탭 (B안 채택)
- **filter 처리:** `active`/`done`은 SQL, `overdue`/`blocked`는 JS (KST 계산/조인 필요)
- **집계 함수 재사용:** `/review`(전체), `/plans/[id]` 돌아보기 탭(계획별), `/api/review` 모두 `computeAggregates` 하나로

**테스트 파일:**
- `aggregate.test.ts` (15): C28~C32 모든 케이스 + Q2(기록 0개) + Q3(막힘 중복) + 통합
- `idempotency.test.ts` (3): C21 조건부 UPDATE 시뮬레이션
- `kst-boundary.test.ts` (6): C30 KST 경계 + todayKst 형식

### P5 — 카드 5: 내 것으로 채우고, 잃지 않게 (완료 ✅)

**목표:** C34~C36, C78~C82, C57, C58

| 작업 | 상태 |
|------|------|
| P5-1: 실제 할 일 5개 이상 구성 (테스트용 soft delete) | ✅ |
| P5-1.5: `DeleteTaskButton.tsx` (할 일 삭제 UI) | ✅ |
| P5-2: `src/lib/export.ts` + `src/app/api/export/route.ts` | ✅ |
| P5-2-3: `ExportButton.tsx` | ✅ |
| P5-2-4: `/review`에 내보내기 버튼 삽입 | ✅ |
| P5-4: `src/app/page.tsx` 첫 화면 재작성 (C82 상단 배너) | ✅ |
| P5-5: `scripts/gen-schema-json.ts` + `contracts/pds-schema-v2.json` | ✅ |
| P5-6: 스크립트 이스케이프 점검 (C57) | ✅ |
| P5-7: 비밀값 노출 점검 (C58) | ✅ |

**검증 완료:**
- **C78:** 계획 2개 이상 (매일 30분 독서, 저녁 먹고 수업 복습) + 지운 계획 1개 (soft delete)
- **C79:** 할 일 5개 (운동 30분, 물 2L, 스트레칭, 러닝, 독서)
- **C80:** 실행 기록 4건
- **C81:** 돌아보기 채워짐 (계획 수, 완료 수, 실제 시간 등 0 아님)
- **C36:** `/api/export` → JSON 1파일, counts: plans 3, tasks 9, executions 4
- **C82:** 첫 화면 상단 배너, 문구 그대로
- **C57:** 스크립트 모양 글자가 글자로 표시 (React 기본 이스케이프, `dangerouslySetInnerHTML` 없음)
- **C58:** Git에 `.env*`, `.next/` 한 번도 안 올라감. `.gitignore`에 포함

**설계 결정 기록:**
- **P5-1.6 (계획 삭제, soft delete):** `plan.deletedAt` 추가. cascade soft delete로 Plan + Task 같이. PlanRevision/ExecutionLog/ReviewNote는 보존 (C08 정신). 내보내기엔 포함 (C36 정신)
- **내보내기 형식:** JSON 1파일 (Q9-a). 5개 테이블 전부. soft delete 포함
- **스키마 JSON:** `scripts/gen-schema-json.ts`로 자동 생성. 집계·날짜·멱등 규칙 포함
- **Turbopack 캐시 주의:** `.next/cache/turbopack/*.sst`에 env 평문 캐시됨. `.gitignore`로 Git 노출은 방지. Vercel 배포 시엔 자체 빌드라 안전

### P6 — 제출 준비 (완료 ✅)

| 작업 | 상태 |
|------|------|
| P6-1: `.next` 삭제 (로컬 정리) | ✅ |
| P6-2: `README.md` 작성 (기능·구조·집계·로컬 실행) | ✅ |
| P6-3: `submission-checklist.md` 작성 | ✅ |
| P6-4: Vercel 배포 | ✅ |
| P6-5: 시크릿 창 검증 (C01) | ✅ |
| P6-6: `submission-note.md` 최종 정리 | ✅ (이 문서) |

**P6.5 — 다크 CLI 미학 (P6 전 별도 스프린트):**
- 다크 모드 고정 (`<html class="dark">`)
- Emerald accent (`--brand: oklch(0.72 0.15 162)`)
- `--radius: 0` (모든 모서리 각짐)
- 프롬프트 모티프 (`$`, `▸`, `!`, `#`)
- 상태 체크박스 (`[✓]` `[!]` `[ ]`)
- `divide-y` 리스트 (카드 최소화)
- `tabular-nums` (숫자 정렬)
- `Prompt.tsx`, `SectionTitle.tsx` 공용 컴포넌트
- 홈 링크 (`← /`) 모든 페이지에 추가
- `--input-bg` (입력 필드 배경 별도 토큰)

**검증 완료:**
- **결과물 URL:** https://sktassign6-plandosee.vercel.app
- **소스 URL:** https://github.com/dyj02056/sktassign6_plandosee/commit/452d358242232e6bbc727b64244604ccdb553720
- **C01:** 시크릿 창에서 로그인 없이 열림
- **Vercel 배포:** 성공 (환경변수 `DATABASE_URL` 설정 후)

**배포 중 발생한 문제:**
- **첫 배포 실패:** `DATABASE_URL is not set` → Vercel Environment Variables에 `DATABASE_URL` 추가 후 재배포 성공

**설계 결정 기록:**
- **다크 고정:** 시스템 설정 무시, 항상 다크 (impeccable §4.11 Page Theme Lock)
- **CLI 미학:** 터미널 느낌, AI 티 회피 (impeccable §9.F "dark tech" 정식 허용)
- **accent 색:** Emerald (완료/성취 의미, AI가 안 쓰는 색)

---

## 7. 스킬 사용 기록

| 스킬 | 사용 시점 | 결과 |
|------|-----------|------|
| `grill-me` | P0 설계 검증 | `grilling` 스킬 파일이 없어, 그 정신(집요한 인터뷰)을 직접 구현해 Q1~Q9 진행 |
| `impeccable` | 주 디자인 스킬 | P6.5에서 CLI 미학 적용 (다크 고정, accent, rounded-none, 프롬프트) |
| `design-taste-frontend` | 참고만 | 구체 금지 패턴(엠대시, AI Tells)만 차용 |
| `caveman-compress` | 미사용 | submission-note 토큰 여유 있었음 |
| `token-optimizer` | 미사용 | 컨텍스트 압박 없었음 |

---

## 8. AI와 내 판단 (3줄)

> 이 항목은 최종 제출 시 채웁니다. `submission-checklist.md` 4절 참조.

- **AI에게 맡긴 일:** 설계 검증(grilling), 스키마 초안, 셋업 명령 안내, API·화면 코드 초안, 집계 로직 + 테스트 24개, CLI 미학 디자인
- **내가 판단한 일:** DB 호스팅(Neon 전환), shadcn 프리셋(Radix+Lyra), 계획 삭제 방식(soft delete), 실 데이터 구성, `isoDateString`, 탭 확장, 다크+CLI 미학, 홈 링크
- **AI 말을 안 들은 일:** 계획 삭제(AI는 "삭제 안 만듦" 권고 → soft delete로 진행), DB 선택(Supabase → Neon), 디자인 방향(CLI 미학으로 최종)

---

## 9. 남은 작업

**모두 완료.** 과제 6 제출 준비 완료.

- 결과물 URL: https://sktassign6-plandosee.vercel.app
- 소스 URL: https://github.com/dyj02056/sktassign6_plandosee/commit/452d358242232e6bbc727b64244604ccdb553720

---

## 10. 최종 산출물 4종

| # | 산출물 | 상태 | 위치 |
|---|--------|------|------|
| 1 | 결과 산출물 (코드/실행물) | ✅ | https://sktassign6-plandosee.vercel.app |
| 2 | `submission-note.md` | ✅ | 이 문서 (채팅에 전문 정리) |
| 3 | `submission-checklist.md` | ✅ | 저장소 루트 |
| 4 | `README.md` | ✅ | 저장소 루트 |

---

**최종 갱신:** 2026-09-16 (P6-6 완료 시점)