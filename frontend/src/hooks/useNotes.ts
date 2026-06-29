import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import type { NoteResponse } from "../lib/types";

export function useNotes() {
  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async (topicId?: number, roadmapId?: number, starred?: boolean, pinned?: boolean, q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (topicId) params.set("topicId", String(topicId));
      if (roadmapId) params.set("roadmapId", String(roadmapId));
      if (starred) params.set("starred", "true");
      if (pinned) params.set("pinned", "true");
      if (q) params.set("q", q);
      const res = await api.get<NoteResponse[]>(`/notes?${params}`);
      setNotes(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  return { notes, setNotes, loading, error, fetchNotes };
}

export function useNote(id: number | null) {
  const [note, setNote] = useState<NoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setNote(null); return; }
    setLoading(true);
    setError(null);
    api.get<NoteResponse>(`/notes/${id}`)
      .then(setNote)
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load note"))
      .finally(() => setLoading(false));
  }, [id]);

  return { note, setNote, loading, error };
}
