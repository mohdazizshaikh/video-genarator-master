/**
 * Shared readiness state so health checks can report the true status of the
 * heavy video pipeline (ShortCreator) which initializes asynchronously.
 */
export const readiness = {
  shuttingDown: false,
  videoEngineReady: false,
  videoEngineError: false,
};
