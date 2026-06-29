import { useState, useEffect } from "react";
import { api } from "../lib/api";
import type { GraphDTO } from "../lib/types";

export function useGraph(roadmapId: number | null) {
  const [graph, setGraph] = useState<GraphDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roadmapId) return;
    setLoading(true);
    setError(null);
    api.get<GraphDTO>(`/roadmaps/${roadmapId}/graph`)
      .then(setGraph)
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load graph"))
      .finally(() => setLoading(false));
  }, [roadmapId]);

  return { graph, loading, error };
}
