import { isOverdue } from './time';

export type TaskForAggregate = {
  id: string;
  deletedAt: Date | null;
  completedAt: Date | null;
  dueAt: Date | null;
  estimatedMinutes: number;
};

export type ExecutionForAggregate = {
  taskId: string;
  durationMinutes: number;
  blockedReason: string | null;
};

export type Aggregates = {
  planCount: number;      // C28
  doneCount: number;      // C29
  overdueCount: number;   // C30
  blockedCount: number;   // C31
  estimatedMinutes: number; // C32
  actualMinutes: number;    // C32
  diffMinutes: number;      // C32
};

/**
 * C28~C32 집계 계산
 *
 * 규칙 (Q1~Q3 확정):
 * - C28: deletedAt IS NULL인 Task 수
 * - C29: 그중 completedAt IS NOT NULL
 * - C30: completedAt IS NULL AND dueAt < 오늘(KST)  (완료는 제외)
 * - C31: blockedReason이 하나라도 있는 Task 수 (Task 기준)
 * - C32: 예상 = 대상 Task의 estimatedMinutes 합
 *        실제 = 그 Task들의 ExecutionLog duration 합
 *        차이 = 실제 - 예상
 *        Task 0개면 전부 0
 */
export function computeAggregates(
  tasks: TaskForAggregate[],
  executions: ExecutionForAggregate[]
): Aggregates {
  // C28: 지우지 않은 Task만 대상
  const activeTasks = tasks.filter((t) => t.deletedAt === null);

  const planCount = activeTasks.length; // C28

  const doneCount = activeTasks.filter((t) => t.completedAt !== null).length; // C29

  const overdueCount = activeTasks.filter((t) =>
    isOverdue(t.dueAt, t.completedAt)
  ).length; // C30

  // C31: 막힌 이유가 하나라도 있는 Task 수 (Task 기준, 중복 제거)
  const taskIdsWithBlock = new Set(
    executions
      .filter((e) => e.blockedReason !== null && e.blockedReason.trim() !== '')
      .map((e) => e.taskId)
  );
  // 대상 Task에 속한 것만 셈
  const activeTaskIds = new Set(activeTasks.map((t) => t.id));
  const blockedCount = [...taskIdsWithBlock].filter((id) =>
    activeTaskIds.has(id)
  ).length; // C31

  // C32: Task 0개면 0
  if (activeTasks.length === 0) {
    return {
      planCount: 0,
      doneCount: 0,
      overdueCount: 0,
      blockedCount: 0,
      estimatedMinutes: 0,
      actualMinutes: 0,
      diffMinutes: 0,
    };
  }

  const estimatedMinutes = activeTasks.reduce(
    (sum, t) => sum + t.estimatedMinutes,
    0
  ); // C32

  const actualMinutes = executions
    .filter((e) => activeTaskIds.has(e.taskId))
    .reduce((sum, e) => sum + e.durationMinutes, 0); // C32

  const diffMinutes = actualMinutes - estimatedMinutes; // C32 (실제 - 예상)

  return {
    planCount,
    doneCount,
    overdueCount,
    blockedCount,
    estimatedMinutes,
    actualMinutes,
    diffMinutes,
  };
}