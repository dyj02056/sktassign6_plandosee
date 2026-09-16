import { describe, it, expect } from 'vitest';
import { isOverdue, todayKst } from '@/lib/time';

describe('isOverdue (C30, KST 경계)', () => {
  it('마감이 KST 오늘보다 과거 + 미완료 = 지연', () => {
    const past = new Date('2020-01-01T00:00:00+09:00');
    expect(isOverdue(past, null)).toBe(true);
  });

  it('마감이 KST 미래 + 미완료 = 지연 아님', () => {
    const future = new Date('2099-12-31T00:00:00+09:00');
    expect(isOverdue(future, null)).toBe(false);
  });

  it('마감이 과거여도 완료했으면 지연 아님 (두 번 세지 않기)', () => {
    const past = new Date('2020-01-01T00:00:00+09:00');
    expect(isOverdue(past, new Date())).toBe(false);
  });

  it('dueAt이 null이면 지연 아님', () => {
    expect(isOverdue(null, null)).toBe(false);
  });

  it('문자열 ISO도 처리', () => {
    expect(isOverdue('2020-01-01T00:00:00+09:00', null)).toBe(true);
    expect(isOverdue('2099-12-31T00:00:00+09:00', null)).toBe(false);
  });
});

describe('todayKst', () => {
  it('YYYY-MM-DD 형식 반환', () => {
    const today = todayKst();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});