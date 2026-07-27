// H13.5 — Composite advisory lock keys for UADA reindex.
// The lock itself is acquired inside the `uada_start_reindex` SQL function
// via `pg_try_advisory_xact_lock(namespace, repo)`. We keep constants here so
// multi-repo/multi-namespace deployments can extend without touching the RPC.
export const LOCK_NAMESPACE_ID = 1; // "default"
export const LOCK_REPO_ID = 1; // "uboardasia"

export interface LockKey {
  namespaceId: number;
  repoId: number;
}

export const DEFAULT_LOCK_KEY: LockKey = {
  namespaceId: LOCK_NAMESPACE_ID,
  repoId: LOCK_REPO_ID,
};
