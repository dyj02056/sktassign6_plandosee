import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  date,
  jsonb,
  pgEnum,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from 'next-auth/adapters';

// ============================================================
// T07 인증 — NextAuth + Drizzle Adapter 표준 테이블
// ============================================================

// User — 계정 (T07-C94, C101, C102)
export const user = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  passwordHash: text('password_hash'),
  sessionVersion: integer('session_version').notNull().default(0),   // ★ 추가
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Account — NextAuth OAuth용 (지금은 미사용이지만 Adapter가 요구)
export const account = pgTable('account', {
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  type: text('type').$type<AdapterAccountType>().notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (account) => [
  primaryKey({ columns: [account.provider, account.providerAccountId] }),
]);

// Session — DB 세션 (T07-C108, C109, C111)
export const session = pgTable('session', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),  // T07-C111 만료 시각
});

// VerificationToken — NextAuth Adapter 요구 (미사용이지만 스키마 필요)
export const verificationToken = pgTable('verification_token', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
}, (vt) => [
  primaryKey({ columns: [vt.identifier, vt.token] }),
]);

// ============================================================
// 기존 T06 도메인 테이블 — userId 추가 (T07-C116~C126)
// ============================================================

// 우선순위 enum (Q1 관련)
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high']);

// Plan — 계획 (카드 1, T06-C04~C07)
export const plan = pgTable('plan', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }), // ★ T07 소유자
  title: text('title').notNull(),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  priority: priorityEnum('priority').notNull(),
  successCriteria: text('success_criteria').notNull(),
  estimatedMinutes: integer('estimated_minutes').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (plan) => [
  index('plan_user_id_idx').on(plan.userId),   // T07-C125 목록 필터
]);

// PlanRevision — 수정 이력 (Q4 확정, T06-C08)
export const planRevision = pgTable('plan_revision', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }), // ★
  planId: uuid('plan_id').notNull().references(() => plan.id, { onDelete: 'cascade' }),
  snapshot: jsonb('snapshot').notNull(),
  changedFields: text('changed_fields').array().notNull(),
  revisedAt: timestamp('revised_at', { withTimezone: true }).notNull().defaultNow(),
}, (pr) => [
  index('plan_revision_user_id_idx').on(pr.userId),
]);

// Task — 할 일 (Q6 확정, T06-C09)
export const task = pgTable('task', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }), // ★
  planId: uuid('plan_id').notNull().references(() => plan.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  dueAt: timestamp('due_at', { withTimezone: true }),
  estimatedMinutes: integer('estimated_minutes').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (task) => [
  index('task_user_id_idx').on(task.userId),
]);

// ExecutionLog — 실행 기록 (Q5 확정, T06-C23~C26)
export const executionLog = pgTable('execution_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }), // ★
  taskId: uuid('task_id').notNull().references(() => task.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  blockedReason: text('blocked_reason'),
}, (el) => [
  index('execution_log_user_id_idx').on(el.userId),
]);

// ReviewNote — 돌아보기 → 다음 계획 (T06-C33)
export const reviewNote = pgTable('review_note', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }), // ★
  planId: uuid('plan_id').notNull().references(() => plan.id, { onDelete: 'cascade' }),
  fixNote: text('fix_note').notNull(),
  carriedToPlanId: uuid('carried_to_plan_id').references(() => plan.id),
}, (rn) => [
  index('review_note_user_id_idx').on(rn.userId),
]);