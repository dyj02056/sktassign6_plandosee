import type { InferSelectModel } from 'drizzle-orm';
import { reviewNote } from '@/db/schema';

type Note = InferSelectModel<typeof reviewNote>;

export function ReviewNoteList({ notes }: { notes: Note[] }) {
  if (notes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        아직 저장된 고칠 점이 없습니다.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {notes.map((n) => (
        <li key={n.id} className="rounded-md border bg-muted/30 p-3 text-sm">
          {n.fixNote}
        </li>
      ))}
    </ul>
  );
}