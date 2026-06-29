# Roadmap Import — Technical Plan & Implementation

> Transforming the `kamranahmedse/developer-roadmap` (roadmap.sh) repository into a
> reusable, source-agnostic roadmap template system for the Jumpstart Learning OS.

---

## 1. Repository Analysis

The `developer-roadmap` repository is an Astro + React-Flow application. The
**content** (what we care about) is decoupled from the **rendering** app and lives
almost entirely under `src/data/`. We cloned a sparse checkout (`src/data`,
`src/components`) so only content trees were fetched.

### Top-level content sources

| Path | Purpose |
|------|---------|
| `src/data/roadmaps/<key>/` | One directory per roadmap (88 total) |
| `src/data/projects/*.md` | 69 standalone project ideas |
| `src/data/best-practices/<key>/` | Best-practice guides (graph + content) |
| `src/data/question-groups/<key>/` | Interview question sets (12 topics) |
| `src/data/videos/*.md` | Video metadata |
| `src/data/authors/*.md` | Author bios |

### Roadmap content model (per roadmap `<key>`)

- **`<key>.md`** — YAML frontmatter carrying **all metadata**: `title`,
  `description`, `briefTitle`, `order`, `hasTopics`, `tags`, `relatedRoadmaps`,
  `seo`, `schema`, `dimensions`. Body is long-form prose.
- **`<key>.json`** — a **React-Flow graph** with `nodes[]` and `edges[]`.
  - `nodes` carry `id`, `type`, `position`, `data.label`.
  - Node `type` distinguishes real content (`topic`, `subtopic`) from
    decoration (`button`, `vertical`, `paragraph`, `label`, `simplebezier`,
    `straight`, `legend`, `step`, `title`).
  - Frontend roadmap example: **25 topics + 90 subtopics**.
- **`content/<slug>@<nodeId>.md`** — one markdown file **per topic/subtopic node**,
  named `<slug>@<nodeId>.md` where `nodeId` is the graph node id. Contains a
  short description plus a "Visit the following resources" list.
- **`migration-mapping.json`** — maps `topic` and `topic:subtopic` slugs → node
  ids. **This is the hierarchy source of truth**: keys with a `:` are children of
  the segment before the `:`.
- **`<key>-beginner.json`** — optional beginner variant graph.
- **`faqs.astro`** — FAQ entries.

### Resource link grammar

Inside content markdown, resources are encoded as:

```
- [@<type>@<title>](<url>)
```

Observed `<type>` values (with counts): `article`, `video`, `official`,
`roadmap`, `course`, `opensource`, `book`, `feed`.

### Graph edges (dependencies & order)

Each edge has `source`, `target`, `sourceHandle`/`targetHandle`, and
`data.edgeStyle` of `solid` (required sequence) or `dashed` (optional/related).
Edges connect node ids; many edges touch decorative connector nodes that must be
filtered out.

### Cross-references

- Projects link back to roadmaps via frontmatter `roadmapIds: [...]`.
- Roadmaps reference siblings via `relatedRoadmaps: [...]`.
- Question-groups are keyed by topic (`frontend`, `backend`, …) and carry
  `questions[]` (each with `question`, `answer` file, `topics[]`).

---

## 2. Content Structure (normalized)

Independent of roadmap.sh's internal representation, the meaningful content is:

```
Roadmap
 ├── metadata (title, description, category, tags, order, related)
 ├── topics[]                       (top-level, ordered)
 │    ├── id, title, description
 │    ├── children[] (subtopics)    (id, title, description, resources[])
 │    ├── resources[]               (type, title, url)
 │    └── difficulty, estHours
 ├── edges[]                        (from, to, type=prerequisite|related)
 ├── projects[]                     (title, description, difficulty, skills[], url)
 └── questions[]                    (question, answer, topics[])
```

Hierarchy (topic → subtopic) comes from `migration-mapping.json`; the prerequisite
graph comes from filtered `edges`; resources come from parsed content markdown.

---

## 3. Data Extraction Strategy

A **single Node.js extractor** (`scripts/roadmap-extractor/extract.mjs`) is the
**only code that knows roadmap.sh's format**. It:

1. Reads `<repo>/src/data/roadmaps/<key>/` for a curated set of roadmaps.
2. Parses `<key>.md` frontmatter (js-yaml) → roadmap metadata.
3. Loads `migration-mapping.json` → builds `nodeId → stableId` and the
   parent/child hierarchy. Stable ids are **slug-based** (`internet`,
   `internet:how-does-the-internet-work`) — never the raw node hash, so they
   survive upstream graph rewrites.
4. Loads `<key>.json` → keeps `topic`/`subtopic` nodes; for any node missing
   from the mapping, derives a slug from `data.label`.
5. Parses each `content/<slug>@<nodeId>.md` → description + resources (regex on
   `[@type@title](url)`).
6. Filters `edges` to those where both endpoints are content nodes and the
   target is **not** a child of the source → emits `prerequisite`/`related`
   edges using stable ids.
7. Scans `src/data/projects/*.md`, keeping those whose `roadmapIds` include the
   key.
8. Reads `src/data/question-groups/<key>/` if present → questions.
9. Emits one **IR JSON file** per roadmap to the output directory.

The extractor is parameterized (`--repo`, `--out`, `--roadmaps`) so it can be
re-run when upstream content changes. roadmap.sh becomes **one source among
many** — a future source only needs a sibling extractor that emits the same IR.

---

## 4. Generic Roadmap Schema (Intermediate Representation)

Versioned, source-agnostic, human-readable. This is the contract every content
source must produce and the backend consumes.

```jsonc
{
  "schemaVersion": "1.0",
  "source": {
    "id": "roadmap.sh",
    "sourceRoadmapId": "frontend",
    "url": "https://roadmap.sh/frontend",
    "extractedAt": "2026-06-27T07:00:00Z"
  },
  "roadmap": {
    "key": "frontend",
    "title": "Frontend Developer",
    "description": "…",
    "category": "Engineering",
    "tags": ["role-roadmap"],
    "colorTheme": "EMBER",
    "metadata": { "order": 1, "hasTopics": true, "relatedRoadmaps": ["react"] }
  },
  "topics": [
    {
      "id": "internet",
      "title": "Internet",
      "description": "…",
      "difficulty": 1,
      "estHours": 2.0,
      "children": [
        {
          "id": "internet:how-does-the-internet-work",
          "title": "How does the internet work?",
          "description": "…",
          "resources": [
            { "type": "ARTICLE", "title": "Introduction to Internet", "url": "https://…" }
          ]
        }
      ],
      "resources": [ { "type": "VIDEO", "title": "…", "url": "https://…" } ]
    }
  ],
  "edges": [
    { "from": "internet", "to": "html", "type": "prerequisite" }
  ],
  "projects": [
    { "title": "Todo List API", "description": "…", "difficulty": 1,
      "skills": ["RESTful API"], "url": "https://roadmap.sh/projects/todo-list-api" }
  ],
  "questions": [
    { "question": "…", "answer": "…", "topics": ["Beginner"] }
  ]
}
```

Design rules:
- **Stable ids** are slug-based and source-independent in spirit (the `:`
  convention encodes hierarchy generically).
- **Resource types** are normalized to Jumpstart's `ResourceType` enum
  (`ARTICLE`, `VIDEO`, `DOCUMENTATION`, `COURSE`, `BOOK`, `GITHUB`, `CUSTOM`).
- `difficulty` (1–3) and `estHours` are defaulted heuristically where the source
  omits them.
- `children` carry hierarchy; `edges` carry **only** the cross-topic dependency
  graph (no parent→child duplication).

---

## 5. Import Workflow

```
developer-roadmap repo
        │  (extractor — the only roadmap.sh-aware code)
        ▼
  IR JSON files   (backend/src/main/resources/roadmap-templates/*.json)
        │  (RoadmapTemplateLoader — reads at startup, cached)
        ▼
  GET /api/templates           → browse available templates
  POST /api/templates/{key}/import  → instantiate for a user
        │
        ▼
  Roadmap + Topics (parent/child) + Resources + TopicEdges  (per-user data)
```

- **Browse**: `GET /api/templates` lists IR summaries (key, title, category,
  topicCount, source) — no user data touched.
- **Import**: `POST /api/templates/{key}/import` creates an owned `Roadmap`,
  flattens `topics` + `children` into `Topic` rows (children get `parentId`),
  creates `ResourceItem` rows linked to their topic, and persists `TopicEdge`
  rows for the prerequisite graph. Fully transactional.
- **Idempotency / re-import**: each import is a fresh user-owned copy; the
  template catalog itself is read-only.

---

## 6. Storage Architecture

Chosen **after** inspecting the data (a graph with hierarchy + cross-edges), not
assumed:

- **Template catalog** — version-controlled IR JSON in
  `resources/roadmap-templates/`, loaded into memory at startup. No DB row per
  template; keeps the catalog cheap to update via re-running the extractor.
- **User data** (existing entities, extended):
  - `Roadmap` — unchanged.
  - `Topic` — **+`parent_id`** (nullable; subtopics point at their parent topic)
    and **+`source_ref`** (the IR stable id, for traceability/updates).
  - `TopicEdge` (**new table**) — `from_topic_id`, `to_topic_id`,
    `edge_type` (`PREREQUISITE`/`RELATED`). Preserves the learning graph.
  - `ResourceItem` — unchanged; linked to `Topic` via existing `topic_id`.

This is a **hybrid model**: hierarchical adjacency (`parent_id`) for the
topic/subtopic tree, plus an edge table for the many-to-many prerequisite graph.
A pure adjacency-list or pure nested-set was rejected — the source genuinely has
**both** a shallow tree and a DAG, so modeling both explicitly is the honest fit.

### Flyway migration `V5__roadmap_templates_ir.sql`
```sql
ALTER TABLE topics ADD COLUMN parent_id BIGINT NULL;
ALTER TABLE topics ADD COLUMN source_ref VARCHAR(120) NULL;
ALTER TABLE topics ADD CONSTRAINT fk_topic_parent
  FOREIGN KEY (parent_id) REFERENCES topics(id) ON DELETE CASCADE;

CREATE TABLE topic_edges (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  roadmap_id BIGINT NOT NULL,
  from_topic_id BIGINT NOT NULL,
  to_topic_id BIGINT NOT NULL,
  edge_type VARCHAR(20) NOT NULL,
  CONSTRAINT fk_edge_roadmap FOREIGN KEY (roadmap_id)
    REFERENCES roadmaps(id) ON DELETE CASCADE,
  CONSTRAINT fk_edge_from FOREIGN KEY (from_topic_id)
    REFERENCES topics(id) ON DELETE CASCADE,
  CONSTRAINT fk_edge_to FOREIGN KEY (to_topic_id)
    REFERENCES topics(id) ON DELETE CASCADE
);
```

---

## 7. Update Strategy

- **Catalog updates**: re-run `npm run extract` against a fresh clone; commit the
  regenerated IR JSON. Diff-friendly (sorted keys, stable ids) so changes review
  cleanly.
- **Per-user roadmaps** are **not** auto-mutated when templates change — they are
  user-owned snapshots. `source_ref` on each topic lets a future "sync" feature
  detect drift and offer to merge new subtopics/resources without clobbering
  user progress.
- The IR `schemaVersion` field lets the loader reject/upgrade incompatible files.

---

## 8. Scalability Considerations

- 88 roadmaps available; we ship a **curated subset** to keep the catalog
  focused, but the loader scans the whole directory, so adding more is a
  file-drop.
- Templates load once at startup into an in-memory map; browsing is O(1).
- Large roadmaps (e.g. frontend = 115 content nodes) import in a single
  transactional batch — fine for a personal learning tool.
- The IR is plain JSON over HTTP; no coupling to roadmap.sh types on the client
  or in the API contract.
- A future second source (e.g. a curated internal curriculum) only needs to
  produce the same IR JSON — zero backend/frontend changes.

---

## 9. Extension Points

The IR and schema are built to hold more than roadmap.sh offers:

- `resources[]` already typed for docs, videos, articles, books, courses, repos.
- **Future content kinds** (practice exercises, coding challenges, quizzes,
  flashcards, interview prep, AI-generated notes) slot in as new top-level IR
  arrays (`exercises`, `quizzes`, `flashcards`, …) consumed by new import
  branches — the template loader uses a lenient parser that ignores unknown
  keys.
- **User progress / bookmarks / revision tracking** live on the existing
  per-user entities (`Topic.status`, `ResourceItem.bookmarked/completed`,
  `StudySession`) and are orthogonal to the template catalog.
- **Personalized paths**: with `TopicEdge` stored, we can compute a personalized
  topological order from the user's completed topics — the graph is the
  foundation for adaptive sequencing.

---

## 10. Migration Strategy

1. Add the extractor + IR JSON to the repo (no runtime impact).
2. Add Flyway V5 (additive columns + new table — non-breaking).
3. Ship `RoadmapTemplateLoader` + rewritten `RoadmapTemplateService`; the
   hardcoded `TEMPLATES` map is removed. The public API
   (`GET/POST /api/templates`) is unchanged, so the frontend keeps working.
4. Frontend switches from its hardcoded `ROADMAP_TEMPLATES` to `GET /api/templates`
   and from manual roadmap+topic creation to `POST /api/templates/{key}/import`.

No data migration of existing user rows is required — `parent_id`/`source_ref`
default to NULL for legacy topics.

---

## 11. Risks & Edge Cases

- **Decorative nodes in edges**: filtered by node `type`; edges touching
  non-content nodes are dropped.
- **Nodes missing from `migration-mapping.json`**: slug is derived from
  `data.label`; duplicate slugs are de-duplicated with a suffix.
- **`estHours`/`difficulty` absent in source**: defaulted (difficulty 1,
  estHours 2.0); the DB columns are `NOT NULL` so defaults are required.
- **Cycles in the graph**: roadmap.sh graphs are acyclic by intent, but the
  importer stores edges as-is; a cycle would only affect future topological
  ordering, which will guard against cycles.
- **Roadmap.sh license**: content is MIT-licensed; attribution is preserved via
  the `source` block and resource URLs.
- **Upstream node-id churn**: mitigated by slug-based stable ids.
- **Schema drift**: `schemaVersion` + lenient loader.

---

## 12. Files delivered

- `docs/roadmap-import-plan.md` — this document.
- `scripts/roadmap-extractor/{package.json,extract.mjs,README.md}` — extractor.
- `backend/src/main/resources/roadmap-templates/*.json` — generated IR.
- `backend …/templates/{RoadmapTemplateIr.java, RoadmapTemplateLoader.java}` —
  IR DTOs + loader.
- `backend …/templates/RoadmapTemplateService.java` — rewritten importer.
- `backend …/topic/{Topic.java, TopicEdge.java, TopicEdgeRepository.java,
  EdgeType.java}` — graph storage.
- `backend …/resources/db/migration/V5__roadmap_templates_ir.sql`.
- `frontend …/components/roadmaps/RoadmapDotShImportModal.tsx` — API-driven.
- `frontend …/lib/types.ts` — extended `TemplateSummary`.
