import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  date,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';

// 우선순위 enum (Q1 관련)
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high']);

// Plan — 계획 (카드 1, T06-C04~C07)
export const plan = pgTable('plan', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  periodStart: date('period_start').notNull(),       // T06-C04
  periodEnd: date('period_end').notNull(),           // T06-C04
  priority: priorityEnum('priority').notNull(),      // T06-C05
  successCriteria: text('success_criteria').notNull(), // T06-C06
  estimatedMinutes: integer('estimated_minutes').notNull(), // T06-C07
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // ★ 추가 (soft delete)
});

// PlanRevision — 수정 이력 (Q4 확정, T06-C08)
export const planRevision = pgTable('plan_revision', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull().references(() => plan.id, { onDelete: 'cascade' }),
  snapshot: jsonb('snapshot').notNull(),             // 수정 직전 Plan 전체
  changedFields: text('changed_fields').array().notNull(), // 실제 비교로 채움
  revisedAt: timestamp('revised_at', { withTimezone: true }).notNull().defaultNow(),
});

// Task — 할 일 (Q6 확정, T06-C09)
export const task = pgTable('task', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull().references(() => plan.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  dueAt: timestamp('due_at', { withTimezone: true }),  // T06-C30 지연 판정
  estimatedMinutes: integer('estimated_minutes').notNull(), // T06-C32
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // soft delete (T06-C28)
  completedAt: timestamp('completed_at', { withTimezone: true }), // ★ 완료 진실 (Q6)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ExecutionLog — 실행 기록 (Q5 확정, T06-C23~C26)
export const executionLog = pgTable('execution_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => task.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),  // T06-C23
  endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),      // T06-C24
  durationMinutes: integer('duration_minutes').notNull(),                // T06-C25
  blockedReason: text('blocked_reason'),                                 // T06-C26
});

// ReviewNote — 돌아보기 → 다음 계획 (T06-C33)
export const reviewNote = pgTable('review_note', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull().references(() => plan.id, { onDelete: 'cascade' }),
  fixNote: text('fix_note').notNull(),               // 고칠 점 1건
  carriedToPlanId: uuid('carried_to_plan_id').references(() => plan.id), // 다음 계획
});