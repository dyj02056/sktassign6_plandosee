import { describe, it, expect } from 'vitest';
import { computeAggregates } from '@/lib/aggregate';
import type {
  TaskForAggregate,
  ExecutionForAggregate,
} from '@/lib/aggregate';

// 헬퍼: Task 생성
function t(overrides: Partial<TaskForAggregate> = {}): TaskForAggregate {
  return {
    id: crypto.randomUUID(),
    deletedAt: null,
    completedAt: null,
    dueAt: null,
    estimatedMinutes: 30,
    ...overrides,
  };
}

// 헬퍼: ExecutionLog 생성
function e(
  taskId: string,
  overrides: Partial<ExecutionForAggregate> = {}
): ExecutionForAggregate {
  return {
    taskId,
    durationMinutes: 10,
    blockedReason: null,
    ...overrides,
  };
}

// KST 기준 오늘 (테스트에서는 고정하지 않고 "과거"와 "미래"로 표현)
const PAST_KST = new Date('2020-01-01T00:00:00+09:00'); // 확실히 과거
const FUTURE_KST = new Date('2099-12-31T00:00:00+09:00'); // 확실히 미래

describe('computeAggregates (C28~C32)', () => {
  describe('C28: 계획 수 = 지우지 않은 할 일 수', () => {
    it('deletedAt이 있는 Task는 제외', () => {
      const tasks = [
        t(),
        t(),
        t({ deletedAt: new Date() }), // 지운 것
      ];
      const result = computeAggregates(tasks, []);
      expect(result.planCount).toBe(2);
    });

    it('Task 0개면 planCount=0', () => {
      const result = computeAggregates([], []);
      expect(result.planCount).toBe(0);
    });
  });

  describe('C29: 완료 수 = 완료 상태 할 일 수', () => {
    it('completedAt이 있는 것만 셈', () => {
      const tasks = [
        t({ completedAt: new Date() }),
        t({ completedAt: new Date() }),
        t(), // 미완료
      ];
      const result = computeAggregates(tasks, []);
      expect(result.doneCount).toBe(2);
    });
  });

  describe('C30: 지연 수', () => {
    it('미완료 + 마감 지남 = 지연', () => {
      const tasks = [
        t({ dueAt: PAST_KST, completedAt: null }), // 지연
        t({ dueAt: FUTURE_KST, completedAt: null }), // 아직 안 지남
      ];
      const result = computeAggregates(tasks, []);
      expect(result.overdueCount).toBe(1);
    });

    it('완료한 할 일은 지연으로 세지 않음 (두 번 세지 않기)', () => {
      const tasks = [
        t({ dueAt: PAST_KST, completedAt: new Date() }), // 마감 지났지만 완료
      ];
      const result = computeAggregates(tasks, []);
      expect(result.overdueCount).toBe(0);
    });

    it('dueAt이 없으면 지연 아님', () => {
      const tasks = [t({ dueAt: null, completedAt: null })];
      const result = computeAggregates(tasks, []);
      expect(result.overdueCount).toBe(0);
    });
  });

  describe('C31: 막힘 수 (Task 기준)', () => {
    it('한 Task에 막힌 기록 2개여도 1', () => {
      const task1 = t();
      const executions = [
        e(task1.id, { blockedReason: 'API 키 없음' }),
        e(task1.id, { blockedReason: '네트워크 오류' }),
      ];
      const result = computeAggregates([task1], executions);
      expect(result.blockedCount).toBe(1);
    });

    it('막힌 이유가 null이면 안 셈', () => {
      const task1 = t();
      const executions = [e(task1.id, { blockedReason: null })];
      const result = computeAggregates([task1], executions);
      expect(result.blockedCount).toBe(0);
    });

    it('빈 문자열 막힌 이유는 안 셈', () => {
      const task1 = t();
      const executions = [e(task1.id, { blockedReason: '   ' })];
      const result = computeAggregates([task1], executions);
      expect(result.blockedCount).toBe(0);
    });

    it('여러 Task에 걸친 막힘은 각각 셈', () => {
      const task1 = t();
      const task2 = t();
      const executions = [
        e(task1.id, { blockedReason: 'A' }),
        e(task2.id, { blockedReason: 'B' }),
      ];
      const result = computeAggregates([task1, task2], executions);
      expect(result.blockedCount).toBe(2);
    });
  });

  describe('C32: 예상/실제/차이', () => {
    it('Task 0개면 전부 0 (Q2 확정)', () => {
      const result = computeAggregates([], []);
      expect(result.estimatedMinutes).toBe(0);
      expect(result.actualMinutes).toBe(0);
      expect(result.diffMinutes).toBe(0);
    });

    it('Task 있고 기록 0개면 예상 그대로, 실제 0, 차이 = -예상 (Q2 확정)', () => {
      const tasks = [
        t({ estimatedMinutes: 30 }),
        t({ estimatedMinutes: 60 }),
      ];
      const result = computeAggregates(tasks, []);
      expect(result.estimatedMinutes).toBe(90);
      expect(result.actualMinutes).toBe(0);
      expect(result.diffMinutes).toBe(-90); // 0 - 90
    });

    it('기록이 있으면 실제 시간 합계', () => {
      const task1 = t({ estimatedMinutes: 30 });
      const task2 = t({ estimatedMinutes: 60 });
      const executions = [
        e(task1.id, { durationMinutes: 25 }),
        e(task1.id, { durationMinutes: 5 }),
        e(task2.id, { durationMinutes: 70 }),
      ];
      const result = computeAggregates([task1, task2], executions);
      expect(result.estimatedMinutes).toBe(90);
      expect(result.actualMinutes).toBe(100); // 25+5+70
      expect(result.diffMinutes).toBe(10); // 100 - 90
    });

    it('지운 Task의 실행 기록은 셈하지 않음', () => {
      const activeTask = t({ estimatedMinutes: 30 });
      const deletedTask = t({ deletedAt: new Date(), estimatedMinutes: 60 });
      const executions = [
        e(activeTask.id, { durationMinutes: 20 }),
        e(deletedTask.id, { durationMinutes: 50 }),
      ];
      const result = computeAggregates([activeTask, deletedTask], executions);
      expect(result.estimatedMinutes).toBe(30);
      expect(result.actualMinutes).toBe(20);
      expect(result.diffMinutes).toBe(-10);
    });
  });

  describe('통합 시나리오', () => {
    it('여러 조건이 섞여도 정확', () => {
      const done = t({ completedAt: new Date(), dueAt: PAST_KST, estimatedMinutes: 30 });
      const overdue = t({ completedAt: null, dueAt: PAST_KST, estimatedMinutes: 60 });
      const future = t({ completedAt: null, dueAt: FUTURE_KST, estimatedMinutes: 15 });
      const deleted = t({ deletedAt: new Date(), estimatedMinutes: 999 });

      const executions = [
        e(done.id, { durationMinutes: 25 }),
        e(overdue.id, { durationMinutes: 40, blockedReason: '시간 부족' }),
        e(overdue.id, { durationMinutes: 10, blockedReason: '집중 안 됨' }),
        e(deleted.id, { durationMinutes: 999 }),
      ];

      const result = computeAggregates(
        [done, overdue, future, deleted],
        executions
      );

      expect(result.planCount).toBe(3);      // deleted 제외
      expect(result.doneCount).toBe(1);      // done
      expect(result.overdueCount).toBe(1);   // overdue만 (done은 완료라 제외)
      expect(result.blockedCount).toBe(1);   // overdue (기록 2개여도 1)
      expect(result.estimatedMinutes).toBe(105); // 30+60+15
      expect(result.actualMinutes).toBe(75);     // 25+40+10 (deleted 제외)
      expect(result.diffMinutes).toBe(-30);      // 75-105
    });
  });
});