/**
 * db/schema.ts(진실 공급원) → contracts/pds-schema-v2.json 생성
 *
 * 실행: npm run gen:schema
 *
 * 왜: 스키마를 코드에서 손으로 옮기면 불일치가 생긴다.
 *     이 스크립트가 항상 일치를 보장한다.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatInTimeZone } from 'date-fns-tz';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const KST = 'Asia/Seoul';

// 스키마 정의 (db/schema.ts와 수동 동기화. DB introspection이 아니라 계약 문서)
const schemaDoc = {
  schemaVersion: 'pds-schema-v2',
  generatedAt: formatInTimeZone(new Date(), KST, "yyyy-MM-dd'T'HH:mm:ssXXX"),
  description: '플랜두씨 다이어리 1 (과제 6)의 최종 데이터베이스 스키마',
  dateRule: {
    storage: '모든 날짜·시각은 timestamptz(UTC)로 저장',
    display: '표시·판정은 KST(Asia/Seoul) 기준',
    todayRule:
      'T06-C30의 "오늘"은 요청 시점의 KST 날짜. 자정을 넘기면 지연 수가 바뀐다.',
    source: 'src/lib/time.ts',
  },
  tables: {
    plan: {
      description: '계획 (카드 1)',
      columns: {
        id: 'uuid pk default random',
        title: 'text not null',
        periodStart: 'date not null (T06-C04)',
        periodEnd: 'date not null (T06-C04)',
        priority: 'priority enum not null (low|medium|high, T06-C05)',
        successCriteria: 'text not null (T06-C06)',
        estimatedMinutes: 'integer not null (T06-C07)',
        createdAt: 'timestamptz not null default now()',
        updatedAt: 'timestamptz not null default now()',
        deletedAt: 'timestamptz null (soft delete)', // ★ 추가
      },
    },
    planRevision: {
      description: '계획 수정 이력 (T06-C08)',
      columns: {
        id: 'uuid pk default random',
        planId: 'uuid fk → plan.id (cascade)',
        snapshot: 'jsonb not null (수정 직전 Plan 전체)',
        changedFields: 'text[] not null (실제 비교로 채운 바뀐 필드 이름)',
        revisedAt: 'timestamptz not null default now()',
      },
    },
    task: {
      description: '할 일 (카드 2, Q6 확정: 완료는 completedAt 한 곳)',
      columns: {
        id: 'uuid pk default random',
        planId: 'uuid fk → plan.id (cascade)',
        title: 'text not null',
        dueAt: 'timestamptz null (T06-C30 지연 판정)',
        estimatedMinutes: 'integer not null (T06-C32)',
        deletedAt: 'timestamptz null (soft delete, T06-C28)',
        completedAt: 'timestamptz null (★ 완료 진실, Q6)',
        createdAt: 'timestamptz not null default now()',
      },
      notes: [
        'Task.status 컬럼 없음: completedAt으로 파생 (Q6)',
        'Completion 테이블 없음: completedAt으로 통합 (Q6)',
        'soft delete: deletedAt 설정, 목록/집계는 deletedAt IS NULL만',
      ],
    },
    executionLog: {
      description: '실행 기록 (카드 3, T06-C23~C26)',
      columns: {
        id: 'uuid pk default random',
        taskId: 'uuid fk → task.id (cascade)',
        startedAt: 'timestamptz not null (T06-C23)',
        endedAt: 'timestamptz not null (T06-C24)',
        durationMinutes: 'integer not null (T06-C25)',
        blockedReason: 'text null (T06-C26)',
      },
      notes: [
        '한 Task에 여러 개 정상 (Q5 재기록)',
        'idempotency_key 없음: 실행 기록은 여러 개가 정상',
      ],
    },
    reviewNote: {
      description: '돌아보기 → 다음 계획 (T06-C33)',
      columns: {
        id: 'uuid pk default random',
        planId: 'uuid fk → plan.id (cascade)',
        fixNote: 'text not null',
        carriedToPlanId: 'uuid fk → plan.id null',
      },
    },
  },
  enums: {
    priority: ['low', 'medium', 'high'],
  },
  aggregations: {
    // T06-C28~C32 (src/lib/aggregate.ts, 테스트 24개로 고정)
    planCount: 'COUNT(task WHERE deletedAt IS NULL)',
    doneCount: 'COUNT(task WHERE deletedAt IS NULL AND completedAt IS NOT NULL)',
    overdueCount:
      'COUNT(task WHERE deletedAt IS NULL AND completedAt IS NULL AND dueAt < today_kst)',
    blockedCount:
      'COUNT(DISTINCT task WHERE EXISTS(executionLog WHERE blockedReason IS NOT NULL AND TRIM(blockedReason) != ""))',
    estimatedMinutes: 'SUM(task.estimatedMinutes) over active tasks',
    actualMinutes: 'SUM(executionLog.durationMinutes) over active tasks',
    diffMinutes: 'actualMinutes - estimatedMinutes (Task 0개면 0)',
  },
  idempotency: {
    completion: {
      rule: 'UPDATE task SET completed_at = NOW() WHERE id = ? AND completed_at IS NULL',
      guarantee: 'DB 차원. 버튼 잠금은 UX일 뿐',
      criteria: ['T06-C21', 'T06-C22'],
    },
  },
};

const outPath = join(__dirname, '..', 'contracts', 'pds-schema-v2.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(schemaDoc, null, 2) + '\n', 'utf-8');

console.log(`[gen-schema] wrote ${outPath}`);
console.log(`[gen-schema] tables: ${Object.keys(schemaDoc.tables).join(', ')}`);