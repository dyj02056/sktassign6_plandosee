import { describe, it, expect } from 'vitest';

/**
 * C21 (완료 멱등)의 핵심 로직 검증
 *
 * 실제 멱등 보장은 DB의 조건부 UPDATE가 담당:
 *   UPDATE task SET completed_at = NOW()
 *   WHERE id = ? AND completed_at IS NULL
 *
 * 이 테스트는 그 로직의 의미를 순수 함수로 검증한다.
 * (API 직접 호출 두 번 테스트는 P3에서 수동으로 완료됨)
 */

type Task = { id: string; completedAt: Date | null };

/**
 * 조건부 UPDATE 시뮬레이션:
 * completedAt이 null일 때만 NOW()로 설정. 아니면 그대로.
 */
function applyComplete(task: Task, now: Date): Task {
  if (task.completedAt !== null) {
    return task; // 0행 변경 (멱등)
  }
  return { ...task, completedAt: now };
}

describe('완료 처리 멱등 (C21)', () => {
  it('첫 번째 호출: completedAt 설정', () => {
    const t: Task = { id: 'a', completedAt: null };
    const now = new Date('2026-09-16T10:00:00Z');
    const result = applyComplete(t, now);
    expect(result.completedAt).toEqual(now);
  });

  it('두 번째 호출: completedAt 덮어쓰지 않음 (멱등)', () => {
    const first = new Date('2026-09-16T10:00:00Z');
    const t: Task = { id: 'a', completedAt: first };
    const second = new Date('2026-09-16T11:00:00Z');

    const result = applyComplete(t, second);

    expect(result.completedAt).toEqual(first); // 첫 시각 그대로
    expect(result.completedAt).not.toEqual(second);
  });

  it('여러 번 호출해도 완료는 1건', () => {
    let t: Task = { id: 'a', completedAt: null };
    const first = new Date('2026-09-16T10:00:00Z');
    t = applyComplete(t, first);
    t = applyComplete(t, new Date('2026-09-16T11:00:00Z'));
    t = applyComplete(t, new Date('2026-09-16T12:00:00Z'));

    expect(t.completedAt).toEqual(first);
  });
});