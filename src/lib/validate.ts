import { z } from 'zod';

// Plan 생성/수정 입력 (T06-C04~C07)
export const planInputSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(200),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식'),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식'),
  priority: z.enum(['low', 'medium', 'high']),
  successCriteria: z.string().min(1, '성공 기준을 입력하세요').max(1000),
  estimatedMinutes: z.number().int().min(0).max(100000),
}).refine((data) => data.periodStart <= data.periodEnd, {
  message: '기간 시작이 종료보다 늦을 수 없습니다',
  path: ['periodEnd'],
});

export type PlanInput = z.infer<typeof planInputSchema>;

// ISO 8601 (오프셋 허용) 검증 헬퍼
const isoDateString = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), {
    message: '유효한 날짜가 아닙니다',
  });

// Task 입력 (T06-C09)
export const taskInputSchema = z.object({
  planId: z.string().uuid(),
  title: z.string().min(1, '할 일 제목을 입력하세요').max(200),
  dueAt: isoDateString.nullable().optional(),
  estimatedMinutes: z.number().int().min(0).max(100000),
});

export type TaskInput = z.infer<typeof taskInputSchema>;

// ExecutionLog 입력 (T06-C10)
export const executionInputSchema = z
  .object({
    taskId: z.string().uuid(),
    startedAt: isoDateString,
    endedAt: isoDateString,
    durationMinutes: z.number().int().min(0).max(100000),
    blockedReason: z.string().max(1000).nullable().optional(),
  })
  .refine((data) => new Date(data.startedAt) <= new Date(data.endedAt), {
    message: '시작 시각이 종료 시각보다 늦을 수 없습니다',
    path: ['endedAt'],
  });

export type ExecutionInput = z.infer<typeof executionInputSchema>;