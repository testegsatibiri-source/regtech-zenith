CREATE OR REPLACE FUNCTION public.uada_start_reindex(
  _namespace_id int,
  _repo_id int,
  _model text,
  _dimensions int,
  _commit_sha text,
  _schema_hash text,
  _graph_schema_version text
)
RETURNS TABLE(snapshot_id uuid, version int, acquired boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _v int;
  _id uuid;
  _in_flight int;
BEGIN
  -- Composite (namespace, repo) advisory lock, transaction-scoped.
  IF NOT pg_try_advisory_xact_lock(_namespace_id, _repo_id) THEN
    RETURN QUERY SELECT NULL::uuid, NULL::int, false;
    RETURN;
  END IF;

  -- Also reject if another in-flight reindex slipped through (e.g. stale)
  SELECT count(*) INTO _in_flight
  FROM public.uada_snapshots
  WHERE promotion_state IN ('building','validating','promoting','cancel_requested','cancelling');
  IF _in_flight > 0 THEN
    RETURN QUERY SELECT NULL::uuid, NULL::int, false;
    RETURN;
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1 INTO _v FROM public.uada_snapshots;

  INSERT INTO public.uada_snapshots (
    version, state, promotion_state, commit_sha,
    embedding_model, embedding_dimensions, schema_hash,
    graph_schema_version, stats
  )
  VALUES (
    _v, 'building', 'building', _commit_sha,
    _model, _dimensions, _schema_hash,
    _graph_schema_version, '{}'::jsonb
  )
  RETURNING id INTO _id;

  RETURN QUERY SELECT _id, _v, true;
END;
$$;

REVOKE ALL ON FUNCTION public.uada_start_reindex(int,int,text,int,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.uada_start_reindex(int,int,text,int,text,text,text) TO service_role;