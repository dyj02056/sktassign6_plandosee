import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export const KST = 'Asia/Seoul';

/**
 * 지금 KST 시각을 ISO 문자열로 반환 (예: "2026-09-16T08:56:00+09:00")
 */
export function nowKst(): string {
  return formatInTimeZone(new Date(), KST, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/**
 * 오늘 KST 날짜를 YYYY-MM-DD로 반환 (Q1 확정: 요청 시점 기준)
 */
export function todayKst(): string {
  return formatInTimeZone(new Date(), KST, 'yyyy-MM-dd');
}

/**
 * 임의의 Date를 KST 날짜 문자열(YYYY-MM-DD)로 변환
 */
export function toKstDateString(date: Date): string {
  return formatInTimeZone(date, KST, 'yyyy-MM-dd');
}

/**
 * T06-C30: 마감일이 KST 기준 오늘보다 앞섰고 완료되지 않았으면 true
 * - 완료된 Task는 지연으로 세지 않는다 ("완료한 할 일을 지연으로 두 번 세지 않는다")
 */
export function isOverdue(
  dueAt: Date | string | null,
  completedAt: Date | string | null
): boolean {
  if (!dueAt) return false;
  if (completedAt) return false; // 완료된 건 지연 아님

  const due = typeof dueAt === 'string' ? new Date(dueAt) : dueAt;
  const dueKst = toKstDateString(due);
  const today = todayKst();

  return dueKst < today; // KST 날짜 비교 (자정 경계)
}