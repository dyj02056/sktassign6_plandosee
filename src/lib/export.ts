import { db } from '@/db';
import {
  plan,
  planRevision,
  task,
  executionLog,
  reviewNote,
} from '@/db/schema';
import { formatInTimeZone } from 'date-fns-tz';

const KST = 'Asia/Seoul';

export type ExportPayload = {
  exportedAt: string;
  schemaVersion: string;
  schemaDocUrl: string;
  counts: {
    plans: number;
    planRevisions: number;
    tasks: number;
    executionLogs: number;
    reviewNotes: number;
  };
  plans: unknown[];
  planRevisions: unknown[];
  tasks: unknown[];
  executionLogs: unknown[];
  reviewNotes: unknown[];
};

/**
 * 전체 자료를 파일 하나(JSON)로 내보낼 수 있게 조립 (C36)
 */
export async function buildExportPayload(): Promise<ExportPayload> {
  const [plans, revisions, tasks, executions, notes] = await Promise.all([
    db.select().from(plan),
    db.select().from(planRevision),
    db.select().from(task),
    db.select().from(executionLog),
    db.select().from(reviewNote),
  ]);

  const exportedAt = formatInTimeZone(
    new Date(),
    KST,
    "yyyy-MM-dd'T'HH:mm:ssXXX"
  );

  return {
    exportedAt,
    schemaVersion: 'pds-schema-v2',
    schemaDocUrl: './contracts/pds-schema-v2.json',
    counts: {
      plans: plans.length,
      planRevisions: revisions.length,
      tasks: tasks.length,
      executionLogs: executions.length,
      reviewNotes: notes.length,
    },
    plans,
    planRevisions: revisions,
    tasks,
    executionLogs: executions,
    reviewNotes: notes,
  };
}

/**
 * 파일명: plandussi-export-YYYY-MM-DD.json (KST 날짜)
 */
export function buildExportFilename(): string {
  const date = formatInTimeZone(new Date(), KST, 'yyyy-MM-dd');
  return `plandussi-export-${date}.json`;
}