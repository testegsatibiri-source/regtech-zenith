-- H13 — UADA Knowledge Store, Graph Store, Snapshots, Embeddings, Memory.
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- Helper: platform staff read gate (any of the 4 platform roles).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_uada_reader()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_platform_admin()
      OR public.is_platform_operator()
      OR public.is_platform_auditor()
      OR EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id = auth.uid()
                   AND role = 'country_cto'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_uada_writer()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_platform_admin() OR public.is_platform_operator();
$$;

REVOKE EXECUTE ON FUNCTION public.is_uada_reader() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_uada_writer() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_uada_reader() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_uada_writer() TO authenticated;

-- ---------------------------------------------------------------------------
-- uada_snapshots
-- ---------------------------------------------------------------------------
CREATE TABLE public.uada_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL,
  state text NOT NULL CHECK (state IN ('building','active','archived','deprecated')),
  promotion_state text NOT NULL DEFAULT 'building'
    CHECK (promotion_state IN ('building','validating','promoting','active','failed','archived')),
  commit_sha text,
  embedding_model text NOT NULL,
  embedding_dimensions integer NOT NULL,
  schema_hash text,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  archived_at timestamptz,
  failed_at timestamptz
);
CREATE UNIQUE INDEX uada_snapshots_version_uk ON public.uada_snapshots(version);
CREATE UNIQUE INDEX uada_snapshots_single_active
  ON public.uada_snapshots(state) WHERE state = 'active';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.uada_snapshots TO authenticated;
GRANT ALL ON public.uada_snapshots TO service_role;
ALTER TABLE public.uada_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY uada_snapshots_read ON public.uada_snapshots FOR SELECT
  TO authenticated USING (public.is_uada_reader());
CREATE POLICY uada_snapshots_write ON public.uada_snapshots FOR ALL
  TO authenticated USING (public.is_uada_writer()) WITH CHECK (public.is_uada_writer());

-- ---------------------------------------------------------------------------
-- uada_documents
-- ---------------------------------------------------------------------------
CREATE TABLE public.uada_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.uada_snapshots(id) ON DELETE CASCADE,
  path text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('code','route','migration','adr','doc','config','schema')),
  sha256 text NOT NULL,
  summary text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  content text,
  content_truncated boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (snapshot_id, path)
);
CREATE INDEX uada_documents_snap_kind ON public.uada_documents(snapshot_id, kind);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.uada_documents TO authenticated;
GRANT ALL ON public.uada_documents TO service_role;
ALTER TABLE public.uada_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY uada_documents_read ON public.uada_documents FOR SELECT
  TO authenticated USING (public.is_uada_reader());
CREATE POLICY uada_documents_write ON public.uada_documents FOR ALL
  TO authenticated USING (public.is_uada_writer()) WITH CHECK (public.is_uada_writer());

-- ---------------------------------------------------------------------------
-- uada_embeddings (vector dim not fixed; validated per snapshot)
-- ---------------------------------------------------------------------------
CREATE TABLE public.uada_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.uada_documents(id) ON DELETE CASCADE,
  snapshot_id uuid NOT NULL REFERENCES public.uada_snapshots(id) ON DELETE CASCADE,
  embedding_model text NOT NULL,
  embedding_dimensions integer NOT NULL,
  embedding vector,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','ready','failed')),
  last_embedded_at timestamptz,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, embedding_model, embedding_dimensions)
);
CREATE INDEX uada_embeddings_snap_status ON public.uada_embeddings(snapshot_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.uada_embeddings TO authenticated;
GRANT ALL ON public.uada_embeddings TO service_role;
ALTER TABLE public.uada_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY uada_embeddings_read ON public.uada_embeddings FOR SELECT
  TO authenticated USING (public.is_uada_reader());
CREATE POLICY uada_embeddings_write ON public.uada_embeddings FOR ALL
  TO authenticated USING (public.is_uada_writer()) WITH CHECK (public.is_uada_writer());

-- ---------------------------------------------------------------------------
-- uada_graph_nodes / uada_graph_edges
-- ---------------------------------------------------------------------------
CREATE TABLE public.uada_graph_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.uada_snapshots(id) ON DELETE CASCADE,
  kind text NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  path text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (snapshot_id, kind, key)
);
CREATE INDEX uada_graph_nodes_snap ON public.uada_graph_nodes(snapshot_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.uada_graph_nodes TO authenticated;
GRANT ALL ON public.uada_graph_nodes TO service_role;
ALTER TABLE public.uada_graph_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY uada_graph_nodes_read ON public.uada_graph_nodes FOR SELECT
  TO authenticated USING (public.is_uada_reader());
CREATE POLICY uada_graph_nodes_write ON public.uada_graph_nodes FOR ALL
  TO authenticated USING (public.is_uada_writer()) WITH CHECK (public.is_uada_writer());

CREATE TABLE public.uada_graph_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.uada_snapshots(id) ON DELETE CASCADE,
  from_node uuid NOT NULL REFERENCES public.uada_graph_nodes(id) ON DELETE CASCADE,
  to_node uuid NOT NULL REFERENCES public.uada_graph_nodes(id) ON DELETE CASCADE,
  kind text NOT NULL,
  weight double precision NOT NULL DEFAULT 1.0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX uada_graph_edges_snap ON public.uada_graph_edges(snapshot_id);
CREATE INDEX uada_graph_edges_from ON public.uada_graph_edges(from_node);
CREATE INDEX uada_graph_edges_to ON public.uada_graph_edges(to_node);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.uada_graph_edges TO authenticated;
GRANT ALL ON public.uada_graph_edges TO service_role;
ALTER TABLE public.uada_graph_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY uada_graph_edges_read ON public.uada_graph_edges FOR SELECT
  TO authenticated USING (public.is_uada_reader());
CREATE POLICY uada_graph_edges_write ON public.uada_graph_edges FOR ALL
  TO authenticated USING (public.is_uada_writer()) WITH CHECK (public.is_uada_writer());

-- ---------------------------------------------------------------------------
-- uada_index_runs
-- ---------------------------------------------------------------------------
CREATE TABLE public.uada_index_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid REFERENCES public.uada_snapshots(id) ON DELETE SET NULL,
  mode text NOT NULL CHECK (mode IN ('full','incremental')),
  reason text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  files_scanned integer NOT NULL DEFAULT 0,
  files_changed integer NOT NULL DEFAULT 0,
  docs_upserted integer NOT NULL DEFAULT 0,
  docs_skipped integer NOT NULL DEFAULT 0,
  docs_denied integer NOT NULL DEFAULT 0,
  graph_nodes integer NOT NULL DEFAULT 0,
  graph_edges integer NOT NULL DEFAULT 0,
  embedding_batches integer NOT NULL DEFAULT 0,
  embedding_tokens integer NOT NULL DEFAULT 0,
  embedding_cost numeric(12,6) NOT NULL DEFAULT 0,
  coverage jsonb NOT NULL DEFAULT '{}'::jsonb,
  ok boolean NOT NULL DEFAULT false,
  error text
);
CREATE INDEX uada_index_runs_started_at ON public.uada_index_runs(started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.uada_index_runs TO authenticated;
GRANT ALL ON public.uada_index_runs TO service_role;
ALTER TABLE public.uada_index_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY uada_index_runs_read ON public.uada_index_runs FOR SELECT
  TO authenticated USING (public.is_uada_reader());
CREATE POLICY uada_index_runs_write ON public.uada_index_runs FOR ALL
  TO authenticated USING (public.is_uada_writer()) WITH CHECK (public.is_uada_writer());

-- ---------------------------------------------------------------------------
-- uada_memory
-- ---------------------------------------------------------------------------
CREATE TABLE public.uada_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE (scope, key)
);
CREATE INDEX uada_memory_scope ON public.uada_memory(scope);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.uada_memory TO authenticated;
GRANT ALL ON public.uada_memory TO service_role;
ALTER TABLE public.uada_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY uada_memory_read ON public.uada_memory FOR SELECT
  TO authenticated USING (public.is_uada_reader());
CREATE POLICY uada_memory_write ON public.uada_memory FOR ALL
  TO authenticated USING (public.is_uada_writer()) WITH CHECK (public.is_uada_writer());