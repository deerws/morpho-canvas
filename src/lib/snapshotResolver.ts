import type { SelectionsSnapshot, SnapshotEntry } from '@/hooks/useConcepts';
import type { ProductFunction, Principle } from '@/types/morpho';

export type SnapshotStatus = 'identical' | 'modified' | 'removed';

export interface ResolvedSelection {
  functionId: string;
  functionName: string;
  functionColor: string;
  principleId: string;
  principleTitle: string;
  principleDescription: string;
  principleImageUrl: string | null;
  status: SnapshotStatus;
}

/**
 * Resolves a concept's snapshot against the live functions/principles.
 * Always returns the snapshot data (frozen original), but flags whether
 * the live source was modified or removed.
 */
export function resolveSnapshot(
  snapshot: SelectionsSnapshot,
  selections: Record<string, string>,
  functions: ProductFunction[],
  principles: Principle[]
): ResolvedSelection[] {
  const fnMap = new Map(functions.map((f) => [f.id, f]));
  const prMap = new Map(principles.map((p) => [p.id, p]));

  const entries: Array<[string, SnapshotEntry]> = [];
  // Prefer snapshot keys; fallback to selections for legacy concepts with empty snapshot.
  const keys = Object.keys(snapshot).length > 0 ? Object.keys(snapshot) : Object.keys(selections);

  for (const funcId of keys) {
    const snap: SnapshotEntry = snapshot[funcId] || {
      functionName: fnMap.get(funcId)?.name || '',
      functionColor: fnMap.get(funcId)?.color || '#6b7280',
      principleId: selections[funcId] || '',
      principleTitle: prMap.get(selections[funcId] || '')?.title || '',
      principleDescription: prMap.get(selections[funcId] || '')?.description || '',
      principleImageUrl: prMap.get(selections[funcId] || '')?.imageUrl || null,
    };
    entries.push([funcId, snap]);
  }

  return entries.map(([funcId, snap]) => {
    const livePrinciple = snap.principleId ? prMap.get(snap.principleId) : undefined;

    let status: SnapshotStatus = 'identical';
    if (snap.principleId && !livePrinciple) {
      status = 'removed';
    } else if (livePrinciple) {
      const sameTitle = livePrinciple.title === snap.principleTitle;
      const sameDesc = livePrinciple.description === snap.principleDescription;
      const sameImg = (livePrinciple.imageUrl || null) === (snap.principleImageUrl || null);
      if (!sameTitle || !sameDesc || !sameImg) status = 'modified';
    }

    return {
      functionId: funcId,
      functionName: snap.functionName,
      functionColor: snap.functionColor,
      principleId: snap.principleId,
      principleTitle: snap.principleTitle,
      principleDescription: snap.principleDescription,
      principleImageUrl: snap.principleImageUrl,
      status,
    };
  });
}
