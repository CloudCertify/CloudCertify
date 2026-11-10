import type { Confidence } from '@/http/generated/api.schemas';

export type Commit = {
  questionId: number;
  answerIds: number[];
  confidence: Confidence | null;
};

type Lane = { inFlight: boolean; queued: Commit | null; failed: Commit | null };

/**
 * Exam commits, serialised per Question with the latest winning: at most one
 * commit per Question is in flight, and a newer one replaces any queued older one
 * instead of racing it. `status` reports each Question as pending, failed or
 * saved (null).
 */
export function createCommitQueue(
  send: (commit: Commit) => Promise<unknown>,
  status: (questionId: number, value: 'pending' | 'failed' | null) => void
) {
  const lanes = new Map<number, Lane>();
  let waiters: (() => void)[] = [];
  let disposed = false;

  const busy = () => [...lanes.values()].some(lane => lane.inFlight);
  const settle = () => {
    if (busy()) return;
    const ready = waiters;
    waiters = [];
    ready.forEach(resolve => resolve());
  };

  const run = async (lane: Lane, commit: Commit) => {
    lane.inFlight = true;
    lane.failed = null;
    let saved = true;
    try {
      await send(commit);
    } catch {
      saved = false;
    }
    if (disposed) return;
    lane.inFlight = false;
    const queued = lane.queued;
    lane.queued = null;
    if (queued) {
      void run(lane, queued);
      return;
    }
    if (!saved) lane.failed = commit;
    status(commit.questionId, saved ? null : 'failed');
    settle();
  };

  const push = (commit: Commit) => {
    if (disposed) return;
    let lane = lanes.get(commit.questionId);
    if (!lane) {
      lane = { inFlight: false, queued: null, failed: null };
      lanes.set(commit.questionId, lane);
    }
    status(commit.questionId, 'pending');
    if (lane.inFlight) lane.queued = commit;
    else void run(lane, commit);
  };

  return {
    push,
    /** Resolves once nothing is in flight or queued. */
    settled: () =>
      busy() ? new Promise<void>(resolve => waiters.push(resolve)) : Promise.resolve(),
    failed: () => [...lanes.values()].flatMap(lane => (lane.failed ? [lane.failed] : [])),
    retryFailed: () => {
      for (const lane of lanes.values()) if (lane.failed) push(lane.failed);
    },
    /** Drops late responses from a Submission the visitor has moved on from. */
    dispose: () => {
      disposed = true;
    }
  };
}

export type CommitQueue = ReturnType<typeof createCommitQueue>;
