import type { SubscriberNotesPatchDto } from '../types';
import type { SubscriberNoteType } from '../types';

function normNoteType(t: SubscriberNoteType | null | undefined): number | null {
  if (t === null || t === undefined) return null;
  const n = Number(t);
  if (n >= 1 && n <= 6) return n;
  return null;
}

/**
 * يبني جسم PATCH /Subscribers/{id}/notes حسب SubscriberNotesPatchDto:
 * - noteType: 1–6 فقط عند تغيّر النوع
 * - clearNoteType: true عند إزالة النوع (لا يُجمع مع noteType)
 * - note: عند تغيّر النص فقط؛ نص غير فارغ
 * - clearNote: true عند مسح النص (كان غير فارغ وأصبح فارغاً)
 */
export function buildSubscriberNotesPatch(
  prev: { noteType?: SubscriberNoteType | null; note?: string | null },
  next: { noteType?: SubscriberNoteType | null; note?: string | null }
): SubscriberNotesPatchDto | null {
  const pT = normNoteType(prev.noteType);
  const nT = normNoteType(next.noteType);
  const pNote = (prev.note ?? '').toString();
  const nNote = (next.note ?? '').toString();

  const dto: SubscriberNotesPatchDto = {};

  if (pT !== nT) {
    if (nT === null && pT !== null) {
      dto.clearNoteType = true;
    } else if (nT !== null) {
      dto.noteType = nT;
    }
  }

  if (pNote !== nNote) {
    if (nNote === '') {
      dto.clearNote = true;
    } else {
      dto.note = nNote;
    }
  }

  if (dto.clearNoteType === true && dto.noteType !== undefined) {
    delete dto.noteType;
  }

  if (
    dto.noteType === undefined &&
    dto.clearNoteType !== true &&
    dto.note === undefined &&
    dto.clearNote !== true
  ) {
    return null;
  }

  return dto;
}
