/**
 * Shared retry terminality contract for BullMQ workers.
 *
 * The job's own `attempts` budget is the single source of truth: a failure is
 * terminal only when the attempt that just failed was the last one BullMQ will
 * execute. Dead-lettering before this point lets a worker record a terminal
 * state while another retry is still scheduled — and a retry that later
 * succeeds would contradict the recorded terminal state.
 */
export function isTerminalAttempt(attemptsMade: number, maxAttempts: number | undefined): boolean {
  return attemptsMade >= Math.max(1, maxAttempts ?? 1);
}
