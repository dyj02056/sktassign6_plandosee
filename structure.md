# 플랜두씨 다이어리 2 — 프로젝트 구조와 아키텍처

> T07: 인증이 붙은 다이어리 앱의 구조, 요청 흐름, 인증 경계, 데이터 모델을 그림으로 설명합니다.

---

## 목차

1. [전체 아키텍처](#1-전체-아키텍처)
2. [디렉터리 구조](#2-디렉터리-구조)
3. [인증 경계 (Authentication Boundary)](#3-인증-경계-authentication-boundary)
4. [요청 흐름](#4-요청-흐름)
   - [4.1 가입 흐름](#41-가입-흐름)
   - [4.2 로그인 흐름](#42-로그인-흐름)
   - [4.3 로그아웃 흐름](#43-로그아웃-흐름)
   - [4.4 보호 경로 접근](#44-보호-경로-접근)
   - [4.5 남의 자료 접근 시도 (거절)](#45-남의-자료-접근-시도-거절)
5. [데이터 모델 (ERD)](#5-데이터-모델-erd)
6. [소유권 검사 지점](#6-소유권-검사-지점)
7. [JWT + sessionVersion 무효화 메커니즘](#7-jwt--sessionversion-무효화-메커니즘)
8. [파일별 역할 요약](#8-파일별-역할-요약)

---

## 1. 전체 아키텍처

```mermaid
flowchart TB
    subgraph Browser["브라우저 (사용자)"]
        UI["React UI<br/>(Next.js App Router)"]
        Cookie["authjs.session-token<br/>(httpOnly 쿠키)"]
    end

    subgraph Vercel["Vercel (배포)"]
        MW["middleware.ts<br/>(Edge Runtime)<br/>auth.config.ts"]
        RSC["서버 컴포넌트<br/>(Node.js Runtime)"]
        API["API 라우트<br/>(Node.js Runtime)<br/>auth.ts"]
    end

    subgraph Neon["Neon Postgres"]
        DB[("9개 테이블<br/>user, session, account,<br/>verification_token,<br/>plan, plan_revision,<br/>task, execution_log,<br/>review_note")]
    end

    UI -->|"1. 페이지 요청"| MW
    MW -->|"2. 세션 확인 (경량)"| MW
    MW -->|"3. 통과 / 리다이렉트"| RSC
    RSC -->|"4. auth() 호출"| API
    RSC -->|"5. DB 조회 (userId 필터)"| DB
    API -->|"6. 세션 + DB 조회"| DB
    API -->|"7. 응답"| UI
    Cookie -.->|"모든 요청에 자동 첨부"| MW
```

**핵심**:
- **미들웨어(Edge)**는 `auth.config.ts`만 로드 → `bcryptjs`/`DrizzleAdapter` 미포함 → Edge 안전
- **서버 컴포넌트/API 라우트(Node.js)**는 `auth.ts`(전체 설정) 로드 → DB 접근 가능

---

## 2. 디렉터리 구조

```
sktassign6_plandosee/
├── src/
│   ├── auth.config.ts          ← Edge 안전 경량 설정 (미들웨어 전용)
│   ├── auth.ts                 ← NextAuth 전체 설정 (Node.js 런타임)
│   ├── middleware.ts           ← 보호 경로 리다이렉트 (Edge)
│   │
│   ├── app/
│   │   ├── layout.tsx          ← SessionProvider로 감쌈
│   │   ├── page.tsx            ← 루트: 로그인 여부 분기
│   │   ├── login/page.tsx      ← HomeLogin 재사용
│   │   ├── signup/page.tsx     ← 회원가입
│   │   ├── plans/              ← 계획 (list, new, [id])
│   │   ├── tasks/              ← 할 일 목록
│   │   ├── logs/               ← 실행 기록 목록
│   │   ├── review/             ← 돌아보기 집계
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── [...nextauth]/route.ts   ← NextAuth 핸들러
│   │       │   ├── signup/route.ts          ← 회원가입
│   │       │   └── logout/route.ts          ← 로그아웃 (sessionVersion++)
│   │       ├── plans/
│   │       │   ├── route.ts                 ← GET (내 것만) / POST
│   │       │   └── [id]/route.ts            ← GET/PUT/DELETE (loadOwnedPlan)
│   │       ├── tasks/route.ts
│   │       ├── executions/route.ts
│   │       └── review/notes/route.ts
│   │
│   ├── components/
│   │   ├── ui/                 ← shadcn/ui 컴포넌트
│   │   └── domain/
│   │       ├── HomeLogin.tsx          ← 로그인 UI (클라이언트)
│   │       ├── HomeDashboard.tsx      ← 로그인 후 홈
│   │       ├── LogoutButton.tsx       ← 로그아웃
│   │       ├── PlanForm.tsx           ← 계획 생성/수정
│   │       └── ... (기존 T06 컴포넌트)
│   │
│   ├── db/
│   │   ├── index.ts            ← Drizzle 연결 (Neon HTTP)
│   │   └── schema.ts           ← 9개 테이블 정의
│   │
│   ├── lib/
│   │   ├── aggregate.ts        ← 집계 함수
│   │   ├── time.ts             ← KST 유틸
│   │   ├── validate.ts         ← Zod 스키마
│   │   └── export.ts           ← JSON 내보내기
│   │
│   └── types/
│       └── next-auth.d.ts      ← Session 타입 확장 (user.id)
│
├── docs/
│   └── screenshots/            ← 5일 기록 스크린샷
│
├── contracts/
│   └── pds-schema-v2.json
│
├── tests/                      ← Vitest
│
├── submission-note.md          ← 인증 설명서 6항목
├── submission-checklist.md     ← T07-C01~C134 대응표
├── README.md
└── structure.md                ← 이 문서
```

---

## 3. 인증 경계 (Authentication Boundary)

```mermaid
flowchart LR
    subgraph Public["공개 영역 (로그인 불필요)"]
        P1["/ (로그인 화면)"]
        P2["/login"]
        P3["/signup"]
        P4["/api/auth/*"]
    end

    subgraph Protected["보호 영역 (로그인 필요)"]
        S1["/plans, /plans/*"]
        S2["/tasks"]
        S3["/logs"]
        S4["/review"]
        S5["/api/plans, /api/tasks,<br/>/api/executions, /api/review/notes"]
    end

    User["사용자"] --> Public
    User -->|"미들웨어 검사"| Protected

    Public -.->|"로그인 안 됨"| Public
    Protected -.->|"로그인 안 됨 → /login 리다이렉트"| P2
    Protected -.->|"로그인 됨 → 통과"| S1
```

| 영역 | 경로 | 미들웨어 | 세션 필요 |
|------|------|----------|-----------|
| 공개 | `/`, `/login`, `/signup`, `/api/auth/*` | 통과 | 아니오 |
| 보호 | 그 외 모든 경로 | 검사 후 리다이렉트 | 예 |
| API | `/api/plans`, `/api/tasks`, ... | 통과 (자체 검사) | 예 (라우트 내부 `auth()`) |

---

## 4. 요청 흐름

### 4.1 가입 흐름

```mermaid
sequenceDiagram
    participant U as 사용자
    participant P as /signup (클라이언트)
    participant A as /api/auth/signup
    participant DB as Neon Postgres

    U->>P: 이메일/비밀번호 입력
    P->>A: POST { email, password, name }
    A->>A: Zod 검증
    A->>DB: SELECT user WHERE email = ?
    DB-->>A: (없음)
    A->>A: bcrypt.hash(password, 10)
    A->>DB: INSERT user (email, passwordHash, sessionVersion=0)
    DB-->>A: 생성된 user
    A-->>P: 201 { id, email, name }
    P->>U: /login?registered=1 로 이동
```

### 4.2 로그인 흐름

```mermaid
sequenceDiagram
    participant U as 사용자
    participant H as HomeLogin (클라이언트)
    participant NA as NextAuth API
    participant Auth as authorize() (auth.ts)
    participant DB as Neon Postgres

    U->>H: 이메일/비밀번호 입력
    H->>NA: signIn('credentials', { redirect: false })
    NA->>Auth: authorize({ email, password })
    Auth->>Auth: Zod 검증
    Auth->>DB: SELECT user WHERE email = ?
    DB-->>Auth: user (passwordHash, sessionVersion)
    Auth->>Auth: bcrypt.compare(password, hash)
    alt 일치
        Auth-->>NA: { id, email, name, sessionVersion }
        NA->>NA: jwt 콜백 → token.id, token.sessionVersion 저장
        NA-->>H: Set-Cookie authjs.session-token (7일)
        H->>U: window.location.href = '/'
    else 불일치
        Auth-->>NA: null
        NA-->>H: error: 'CredentialsSignin'
        H->>U: "이메일 또는 비밀번호가 올바르지 않습니다"
    end
```

### 4.3 로그아웃 흐름

```mermaid
sequenceDiagram
    participant U as 사용자
    participant B as LogoutButton
    participant L as /api/auth/logout
    participant S as NextAuth signOut
    participant DB as Neon Postgres

    U->>B: 로그아웃 클릭
    B->>L: POST /api/auth/logout
    L->>DB: UPDATE user SET sessionVersion = sessionVersion + 1
    DB-->>L: OK
    L-->>B: 200 { ok: true }
    B->>S: signOut({ callbackUrl: '/login' })
    S->>S: 쿠키 삭제
    S-->>U: /login 으로 이동
```

**핵심**: sessionVersion이 증가했으므로, 이전에 발급된 JWT는 **다음 요청부터 무효** (jwt 콜백에서 감지).

### 4.4 보호 경로 접근

```mermaid
sequenceDiagram
    participant U as 사용자
    participant MW as middleware.ts (Edge)
    participant RSC as 서버 컴포넌트 (Node.js)
    participant DB as Neon Postgres

    U->>MW: GET /plans (쿠키 포함)
    MW->>MW: auth.config.ts의 authorized 콜백
    alt 로그인 안 됨
        MW-->>U: 302 → /login
    else 로그인 됨
        MW->>RSC: 통과
        RSC->>RSC: await auth() (auth.ts, jwt 콜백)
        RSC->>DB: SELECT sessionVersion WHERE id = token.id
        alt JWT의 sessionVersion == DB의 sessionVersion
            RSC->>DB: SELECT plan WHERE userId = ? AND deletedAt IS NULL
            DB-->>RSC: 내 plan 목록
            RSC-->>U: HTML 렌더
        else 불일치 (로그아웃됨)
            RSC-->>U: 세션 무효 → /login 리다이렉트
        end
    end
```

### 4.5 남의 자료 접근 시도 (거절)

```mermaid
sequenceDiagram
    participant B as 계정 B (공격자)
    participant API as /api/plans/[id]
    participant DB as Neon Postgres

    B->>API: GET /api/plans/{A의 plan id} (B 쿠키)
    API->>API: await auth() → session.user.id = B
    API->>API: loadOwnedPlan(id, B)
    API->>DB: SELECT * FROM plan WHERE id = ? AND userId = ?
    Note over DB: userId = B,<br/>plan.userId = A
    DB-->>API: (0 rows)
    API-->>B: 404 {"error":"계획을 찾을 수 없습니다"}
```

**핵심**: `id`는 일치하지만 `userId`가 불일치 → **404** (존재 자체를 감춤).

---

## 5. 데이터 모델 (ERD)

```mermaid
erDiagram
    user ||--o{ plan : "소유"
    user ||--o{ plan_revision : "소유"
    user ||--o{ task : "소유"
    user ||--o{ execution_log : "소유"
    user ||--o{ review_note : "소유"
    user ||--o{ session : "가짐"
    user ||--o{ account : "가짐"

    plan ||--o{ plan_revision : "수정 이력"
    plan ||--o{ task : "포함"
    plan ||--o{ review_note : "고칠 점"
    task ||--o{ execution_log : "실행 기록"

    user {
        uuid id PK
        text email UK
        text password_hash
        int session_version "T07 무효화용"
        timestamp created_at
    }

    plan {
        uuid id PK
        uuid user_id FK "T07 추가"
        text title
        date period_start
        date period_end
        enum priority
        text success_criteria
        int estimated_minutes
        timestamp deleted_at
    }

    task {
        uuid id PK
        uuid user_id FK "T07 추가"
        uuid plan_id FK
        text title
        timestamp due_at
        int estimated_minutes
        timestamp completed_at
        timestamp deleted_at
    }

    execution_log {
        uuid id PK
        uuid user_id FK "T07 추가"
        uuid task_id FK
        timestamp started_at
        timestamp ended_at
        int duration_minutes
        text blocked_reason
    }

    plan_revision {
        uuid id PK
        uuid user_id FK "T07 추가"
        uuid plan_id FK
        jsonb snapshot
        text_array changed_fields
        timestamp revised_at
    }

    review_note {
        uuid id PK
        uuid user_id FK "T07 추가"
        uuid plan_id FK
        text fix_note
        uuid carried_to_plan_id
    }

    session {
        text session_token PK
        uuid user_id FK
        timestamp expires
    }

    account {
        uuid user_id FK
        text provider
        text provider_account_id
    }
```

**T07 추가 사항**:
- `user` 테이블 신규 (계정)
- `session`, `account`, `verification_token` (NextAuth Adapter 요구)
- `user.sessionVersion` (무효화용)
- **5개 도메인 테이블에 `user_id` 추가** (FK + index)

---

## 6. 소유권 검사 지점

```mermaid
flowchart TB
    subgraph Layer1["1층: 미들웨어 (Edge)"]
        MW["middleware.ts<br/>auth.config.ts의 authorized"]
        MW_note["로그인 안 됨 → /login"]
    end

    subgraph Layer2["2층: API 라우트 (Node.js)"]
        A1["auth() null 체크 → 401"]
        A2["loadOwnedPlan() → 404"]
        A3["부모 plan/task 소유권 확인 → 404"]
        A4["목록 쿼리에 eq(userId) 필터"]
    end

    subgraph Layer3["3층: 페이지 컴포넌트 (Node.js)"]
        P1["auth() null 체크"]
        P2["DB 쿼리에 eq(userId) 필터"]
    end

    Req["요청"] --> Layer1
    Layer1 --> Layer2
    Layer1 --> Layer3
    Layer2 --> DB[("DB")]
    Layer3 --> DB
```

### 거절 소스 위치 (T07-C126)

| 지점 | 파일 | 조건 | 응답 |
|------|------|------|------|
| 미들웨어 | `middleware.ts` | 로그인 안 됨 + 보호 경로 | 302 → `/login` |
| API 세션 | 각 API 라우트 | `auth()` null | 401 |
| API 소유권 | `src/app/api/plans/[id]/route.ts`의 `loadOwnedPlan()` | `plan.userId ≠ session.user.id` | 404 |
| API 부모 | `src/app/api/tasks/route.ts` 등 | 부모 plan/task 소유자 ≠ 나 | 404 |
| API 목록 | 각 API의 GET | `eq(table.userId, session.user.id)` | 내 것만 |
| 페이지 | `src/app/plans/page.tsx` 등 | `eq(plan.userId, session.user.id)` | 내 것만 |

---

## 7. JWT + sessionVersion 무효화 메커니즘

```mermaid
sequenceDiagram
    participant U as 사용자
    participant NA as NextAuth
    participant DB as DB (user.session_version)

    Note over U,DB: 로그인 시점
    U->>NA: 로그인
    NA->>DB: SELECT session_version
    DB-->>NA: 0
    NA->>NA: JWT = { id, sessionVersion: 0 }
    NA-->>U: 쿠키 (sessionVersion=0)

    Note over U,DB: 정상 요청 (sessionVersion 일치)
    U->>NA: 요청 (쿠키)
    NA->>DB: SELECT session_version
    DB-->>NA: 0
    NA->>NA: 0 === 0 → 통과
    NA-->>U: 200 OK

    Note over U,DB: 로그아웃 → sessionVersion 증가
    U->>NA: POST /api/auth/logout
    NA->>DB: UPDATE session_version = 1
    DB-->>NA: OK

    Note over U,DB: 같은 쿠키로 재요청 (sessionVersion 불일치)
    U->>NA: 요청 (이전 쿠키, sessionVersion=0)
    NA->>DB: SELECT session_version
    DB-->>NA: 1
    NA->>NA: 0 !== 1 → 세션 무효 (null 반환)
    NA-->>U: 401 Unauthorized
```

**핵심**:
- JWT 자체는 여전히 유효 (서명 검증 통과)
- 하지만 **매 요청마다 DB의 `session_version`과 비교**하여 **무효화 감지**
- 로그아웃/비밀번호 변경 시 `session_version += 1` → 이전 JWT 전부 무효

---

## 8. 파일별 역할 요약

### 인증 핵심 파일

| 파일 | 런타임 | 역할 |
|------|--------|------|
| `src/auth.config.ts` | Edge + Node | 경량 설정 (pages, providers=[], authorized 콜백) |
| `src/auth.ts` | Node | 전체 설정 (DrizzleAdapter, Credentials, jwt/session 콜백) |
| `src/middleware.ts` | Edge | `NextAuth(authConfig).auth` — 보호 경로 리다이렉트 |
| `src/app/api/auth/[...nextauth]/route.ts` | Node | NextAuth 핸들러 (GET, POST) |
| `src/app/api/auth/signup/route.ts` | Node | 회원가입 (bcrypt.hash, user INSERT) |
| `src/app/api/auth/logout/route.ts` | Node | sessionVersion += 1 |
| `src/types/next-auth.d.ts` | — | Session.user.id 타입 확장 |

### 소유권 검사 파일

| 파일 | 방식 |
|------|------|
| `src/app/api/plans/[id]/route.ts` | `loadOwnedPlan()` 헬퍼 → 404 |
| `src/app/api/plans/route.ts` | GET에 `eq(userId)` / POST에 `session.user.id` 주입 |
| `src/app/api/tasks/route.ts` | 부모 plan 소유권 확인 |
| `src/app/api/executions/route.ts` | 부모 task 소유권 확인 |
| `src/app/api/review/notes/route.ts` | 부모 plan 소유권 확인 |
| `src/app/page.tsx` | `auth()` + `eq(plan.userId)` |
| `src/app/plans/page.tsx` | `auth()` + `eq(plan.userId)` |
| `src/app/plans/[id]/page.tsx` | `auth()` + `and(eq(plan.id), eq(plan.userId))` |
| `src/app/tasks/page.tsx` | `auth()` + `eq(task.userId)` |
| `src/app/logs/page.tsx` | `auth()` + `eq(executionLog.userId)` |
| `src/app/review/page.tsx` | `auth()` + `eq(task.userId)` |

---

## 관련 문서

- **`submission-note.md`** — 인증 구현 설명서 6항목 + 5일 기록
- **`submission-checklist.md`** — T07-C01~C134 대응표
- **`README.md`** — 프로젝트 소개
- **`contracts/pds-schema-v2.json`** — 스키마 문서 (자동 생성)

---

**작성일**: 2026-09-17
**최종 갱신**: (5일 후)