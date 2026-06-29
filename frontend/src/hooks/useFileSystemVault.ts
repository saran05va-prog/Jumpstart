import { useState, useEffect, useCallback, useRef } from "react";

const IDB_KEY = "vaultSyncHandle";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("VaultSyncDB", 1);
    r.onupgradeneeded = (e) => {
      (e.target as IDBOpenDBRequest).result.createObjectStore("vault");
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function idbPut(key: string, val: unknown) {
  const db = await openDB();
  const tx = db.transaction("vault", "readwrite");
  tx.objectStore("vault").put(val, key);
}

async function idbGet(key: string): Promise<unknown> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction("vault", "readonly");
    const r = tx.objectStore("vault").get(key);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => resolve(null);
  });
}

async function idbDel(key: string) {
  const db = await openDB();
  const tx = db.transaction("vault", "readwrite");
  tx.objectStore("vault").delete(key);
}

export interface VaultFileEntry {
  name: string;
  path: string;
  handle: FileSystemFileHandle;
  folder: string;
}

export interface ParsedNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  jumpstartId: number | null;
  roadmap: string | null;
  roadmapId: number | null;
  topic: string | null;
  topicId: number | null;
}

function parseFrontmatter(raw: string): { frontmatter: Record<string, unknown>; body: string } {
  const frontmatter: Record<string, unknown> = {};
  let body = raw;

  const normalized = raw.replace(/\r\n/g, "\n");
  if (normalized.startsWith("---\n")) {
    const end = normalized.indexOf("\n---\n", 4);
    if (end !== -1) {
      const yaml = normalized.slice(4, end);
      body = normalized.slice(end + 5);
      for (const line of yaml.split("\n")) {
        const m = line.match(/^(\w+):\s*(.*)/);
        if (m) {
          let val: unknown = m[2].trim();
          if (val === "true") val = true;
          else if (val === "false") val = false;
          else if (/^\d+$/.test(val as string)) val = Number(val);
          else if ((val as string).startsWith("[") && (val as string).endsWith("]")) {
            val = (val as string).slice(1, -1).split(",").map((x) => x.trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "")).filter(Boolean);
          } else if ((val as string).startsWith('"') && (val as string).endsWith('"')) {
            val = (val as string).slice(1, -1);
          }
          frontmatter[m[1]] = val;
        }
      }
    }
  }

  return { frontmatter, body };
}

function buildMarkdownContent(
  title: string,
  body: string,
  extras?: Record<string, unknown>,
): string {
  const lines: string[] = ["---"];
  lines.push(`title: "${title.replace(/"/g, '\\"')}"`);
  if (extras) {
    for (const [k, v] of Object.entries(extras)) {
      if (v === null || v === undefined) continue;
      if (Array.isArray(v)) {
        lines.push(
          `${k}: [${v.map((x) => `"${String(x).replace(/"/g, '\\"')}"`).join(", ")}]`,
        );
      } else if (typeof v === "number") {
        lines.push(`${k}: ${v}`);
      } else if (typeof v === "boolean") {
        lines.push(`${k}: ${v}`);
      } else {
        lines.push(`${k}: "${String(v).replace(/"/g, '\\"')}"`);
      }
    }
  }
  lines.push("---\n");
  return lines.join("\n") + body;
}

export function useFileSystemVault() {
  const [vaultHandle, setVaultHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [files, setFiles] = useState<VaultFileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const refreshingRef = useRef(false);

  const isSupported = "showDirectoryPicker" in window;
  const isConnected = vaultHandle !== null;
  const vaultName = vaultHandle?.name ?? null;

  const readDirectory = useCallback(
    async (dir: FileSystemDirectoryHandle, path = ""): Promise<VaultFileEntry[]> => {
      const entries: VaultFileEntry[] = [];
      for await (const entry of dir.values()) {
        if (entry.kind === "file" && entry.name.endsWith(".md")) {
          entries.push({
            name: entry.name,
            path: path + entry.name,
            handle: entry as FileSystemFileHandle,
            folder: path,
          });
        } else if (
          entry.kind === "directory" &&
          !entry.name.startsWith(".") &&
          entry.name !== ".obsidian"
        ) {
          const sub = await readDirectory(
            entry as FileSystemDirectoryHandle,
            path + entry.name + "/",
          );
          entries.push(...sub);
        }
      }
      return entries;
    },
    [],
  );

  const refresh = useCallback(async () => {
    const h = handleRef.current;
    if (!h || refreshingRef.current) return;
    refreshingRef.current = true;
    setLoading(true);
    try {
      const all = await readDirectory(h);
      setFiles(all);
    } catch {
    } finally {
      setLoading(false);
      refreshingRef.current = false;
    }
  }, [readDirectory]);

  const connect = useCallback(async (): Promise<boolean> => {
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      await idbPut(IDB_KEY, handle);
      setVaultHandle(handle);
      handleRef.current = handle;
      return true;
    } catch {
      return false;
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    handleRef.current = null;
    setVaultHandle(null);
    setFiles([]);
    await idbDel(IDB_KEY);
  }, []);

  const reconnect = useCallback(async (): Promise<boolean> => {
    const stored = await idbGet(IDB_KEY);
    if (!stored) return false;
    try {
      const handle = stored as FileSystemDirectoryHandle;
      const perm = await handle.queryPermission({ mode: "readwrite" });
      if (perm !== "granted") return false;
      setVaultHandle(handle);
      handleRef.current = handle;
      return true;
    } catch {
      return false;
    }
  }, []);

  const readFile = useCallback(
    async (entry: VaultFileEntry): Promise<string> => {
      const f = await entry.handle.getFile();
      return f.text();
    },
    [],
  );

  const writeFile = useCallback(
    async (entry: VaultFileEntry, content: string) => {
      const writable = await entry.handle.createWritable();
      await writable.write(content);
      await writable.close();
    },
    [],
  );

  const createFile = useCallback(
    async (
      name: string,
      content = "",
      folder = "",
    ): Promise<VaultFileEntry | null> => {
      const h = handleRef.current;
      if (!h) return null;
      const dir = folder
        ? await h.getDirectoryHandle(folder)
        : h;
      const fh = await dir.getFileHandle(name, { create: true });
      if (content) {
        const writable = await fh.createWritable();
        await writable.write(content);
        await writable.close();
      }
      const entry: VaultFileEntry = {
        name,
        path: folder + name,
        handle: fh,
        folder,
      };
      setFiles((prev) => [...prev, entry]);
      return entry;
    },
    [],
  );

  const deleteFile = useCallback(async (entry: VaultFileEntry) => {
    const h = handleRef.current;
    if (!h) return;
    const dir = entry.folder
      ? await h.getDirectoryHandle(entry.folder)
      : h;
    await dir.removeEntry(entry.name);
    setFiles((prev) => prev.filter((f) => f.path !== entry.path));
  }, []);

  const renameFile = useCallback(
    async (entry: VaultFileEntry, newName: string) => {
      const h = handleRef.current;
      if (!h) return;
      const dir = entry.folder
        ? await h.getDirectoryHandle(entry.folder)
        : h;
      const content = await readFile(entry);
      await dir.removeEntry(entry.name);
      const fh = await dir.getFileHandle(newName, { create: true });
      const writable = await fh.createWritable();
      await writable.write(content);
      await writable.close();
      const updated: VaultFileEntry = {
        name: newName,
        path: entry.folder + newName,
        handle: fh,
        folder: entry.folder,
      };
      setFiles((prev) =>
        prev.map((f) => (f.path === entry.path ? updated : f)),
      );
      return updated;
    },
    [readFile],
  );

  const parseNote = useCallback(
    async (entry: VaultFileEntry): Promise<ParsedNote> => {
      const raw = await readFile(entry);
      const { frontmatter, body } = parseFrontmatter(raw);
      const title = entry.name.replace(/\.md$/, "");
      return {
        id: entry.path,
        title: (frontmatter.title as string) || title,
        content: body.trimStart(),
        tags: (frontmatter.tags as string[]) || [],
        createdAt: (frontmatter.createdAt as string) || "",
        updatedAt: (frontmatter.updatedAt as string) || "",
        jumpstartId: (frontmatter.jumpstartId as number) || null,
        roadmap: (frontmatter.roadmap as string) || null,
        roadmapId: (frontmatter.roadmapId as number) || null,
        topic: (frontmatter.topic as string) || null,
        topicId: (frontmatter.topicId as number) || null,
      };
    },
    [readFile],
  );

  // Refresh when vault handle is first set
  useEffect(() => {
    if (vaultHandle) {
      refresh();
      refreshTimerRef.current = setInterval(refresh, 15000);
      const onFocus = () => refresh();
      window.addEventListener("focus", onFocus);
      return () => {
        if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
        window.removeEventListener("focus", onFocus);
      };
    }
  }, [vaultHandle, refresh]);

  // Try auto-reconnect on mount — does NOT call refresh (the vaultHandle effect above will)
  useEffect(() => {
    reconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isSupported,
    isConnected,
    vaultName,
    files,
    loading,
    connect,
    disconnect,
    refresh,
    readFile,
    writeFile,
    createFile,
    deleteFile,
    renameFile,
    parseNote,
    parseFrontmatter,
    buildMarkdownContent,
  };
}
