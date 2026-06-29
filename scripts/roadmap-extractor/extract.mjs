#!/usr/bin/env node
/**
 * Roadmap.sh → Jumpstart IR extractor.
 *
 * This is the ONLY module that knows roadmap.sh's internal layout. It reads a
 * cloned `kamranahmedse/developer-roadmap` repo and emits one source-agnostic
 * Intermediate Representation (IR) JSON file per roadmap. The backend consumes
 * only the IR — roadmap.sh can be swapped for any source that produces it.
 *
 * Usage:
 *   node extract.mjs --repo <path-to-clone> --out <output-dir> [--roadmaps a,b,c]
 *
 * Defaults read from env: ROADMAP_SH_REPO, ROADMAP_OUT.
 */
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

/* ── Curated roadmap set (subset of the 88 available) ── */
const DEFAULT_ROADMAPS = [
  "frontend", "backend", "react", "nodejs", "vue", "angular", "javascript",
  "typescript", "python", "java", "golang", "rust", "devops", "docker",
  "kubernetes", "aws", "ai-engineer", "data-engineer", "computer-science",
  "system-design", "sql", "mongodb", "linux", "git-github", "spring-boot",
];

/* roadmap.sh resource-type → Jumpstart ResourceType */
const RESOURCE_TYPE_MAP = {
  article: "ARTICLE",
  video: "VIDEO",
  official: "DOCUMENTATION",
  course: "COURSE",
  book: "BOOK",
  opensource: "GITHUB",
  roadmap: "CUSTOM",
  feed: "CUSTOM",
  podcast: "CUSTOM",
  tool: "CUSTOM",
  website: "CUSTOM",
};

const CONTENT_NODE_TYPES = new Set(["topic", "subtopic"]);

function parseArgs() {
  const args = { repo: process.env.ROADMAP_SH_REPO, out: process.env.ROADMAP_OUT, roadmaps: null };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === "--repo") args.repo = process.argv[++i];
    else if (a === "--out") args.out = process.argv[++i];
    else if (a === "--roadmaps") args.roadmaps = process.argv[++i].split(",").map((s) => s.trim());
  }
  if (!args.repo) {
    console.error("Usage: node extract.mjs --repo <path> --out <dir> [--roadmaps a,b]");
    process.exit(1);
  }
  if (!args.out) args.out = "./roadmap-templates";
  if (!args.roadmaps) args.roadmaps = DEFAULT_ROADMAPS;
  return args;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function parseFrontmatter(file) {
  const raw = fs.readFileSync(file, "utf8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { frontmatter: {}, body: raw };
  const frontmatter = yaml.load(m[1]) || {};
  const body = raw.slice(m[0].length).trim();
  return { frontmatter, body };
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[?:&]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function categoryFor(title, tags = []) {
  const t = title.toLowerCase();
  if (/(ai|machine learning|data|ml|mlops|prompt)/.test(t)) return "Data / AI";
  if (/(devops|kubernetes|docker|terraform|aws|cloud|linux)/.test(t)) return "DevOps / Cloud";
  if (/(design|ux)/.test(t)) return "Design";
  if (/(security|qa)/.test(t)) return "Security / QA";
  if (/(computer science|system design|datastructures|algorithm)/.test(t)) return "CS / Architecture";
  return "Engineering";
}

function colorFor(tags = []) {
  if (tags.includes("skill-roadmap")) return "MOSS";
  if (tags.includes("best-practice")) return "GOLD";
  return "EMBER";
}

/* Parse `- [@type@title](url)` links from a content markdown body. */
function parseResources(md) {
  const out = [];
  const re = /\[@([a-z]+)@([^\]]+)\]\(([^)]+)\)/gi;
  let m;
  while ((m = re.exec(md))) {
    out.push({
      type: RESOURCE_TYPE_MAP[m[1].toLowerCase()] || "CUSTOM",
      title: m[2].trim(),
      url: m[3].trim(),
    });
  }
  return out;
}

/* Extract the descriptive paragraph(s) before the resources list. */
function parseDescription(md) {
  const withoutTitle = md.replace(/^#\s.*\n*/, "");
  const cut = withoutTitle
    .split(/\n(?=Visit the following resources|- \[@)/i)[0]
    .trim();
  return cut.replace(/\n{2,}/g, "\n\n").slice(0, 1200);
}

function loadRoadmap(repo, key) {
  const dir = path.join(repo, "src/data/roadmaps", key);
  if (!fs.existsSync(dir)) return null;

  const { frontmatter, body } = parseFrontmatter(path.join(dir, `${key}.md`));
  const mappingPath = path.join(dir, "migration-mapping.json");
  const hasMapping = fs.existsSync(mappingPath);
  const mapping = hasMapping ? readJson(mappingPath) : {}; // slug -> nodeId
  const graph = readJson(path.join(dir, `${key}.json`)); // { nodes, edges }

  /* nodeId -> stable slug id (from migration-mapping, reversed) */
  const nodeIdToStable = {};
  for (const [slug, nodeId] of Object.entries(mapping)) {
    nodeIdToStable[nodeId] = slug;
  }

  /* content files indexed by nodeId */
  const contentDir = path.join(dir, "content");
  const contentFiles = fs.existsSync(contentDir) ? fs.readdirSync(contentDir) : [];
  const contentByNodeId = {};
  for (const f of contentFiles) {
    const at = f.lastIndexOf("@");
    const ext = f.lastIndexOf(".");
    if (at > 0 && ext > at) {
      const nodeId = f.slice(at + 1, ext);
      contentByNodeId[nodeId] = fs.readFileSync(path.join(contentDir, f), "utf8");
    }
  }

  /* content nodes only */
  const nodes = (graph.nodes || []).filter((n) => CONTENT_NODE_TYPES.has(n.type));
  const nodeById = {};
  for (const n of nodes) nodeById[n.id] = n;

  /* assign stable ids (slug-based); dedup */
  const usedIds = new Set();
  const stableIdFor = (n) => {
    if (nodeIdToStable[n.id]) return nodeIdToStable[n.id];
    let base = slugify(n.data?.label || n.id);
    if (!base) base = "topic";
    let id = base;
    let i = 2;
    while (usedIds.has(id)) id = `${base}-${i++}`;
    usedIds.add(id);
    nodeIdToStable[n.id] = id;
    return id;
  };

  /* Pre-assign stable IDs to all content nodes so edges and hierarchy
     work even without migration-mapping.json */
  for (const n of nodes) stableIdFor(n);

  /* hierarchy: a subtopic's parent comes from the `parent:child` slug
     convention in migration-mapping.json. */
  const parentOf = {};
  for (const [slug, nodeId] of Object.entries(mapping)) {
    if (slug.includes(":")) {
      parentOf[nodeId] = slug.split(":")[0];
    }
  }
  /* For unmapped subtopics, infer parent from edges (source = topic). */
  for (const e of graph.edges || []) {
    const s = nodeById[e.source];
    const t = nodeById[e.target];
    if (s && t && s.type === "topic" && t.type === "subtopic" && !parentOf[t.id]) {
      parentOf[t.id] = stableIdFor(s);
    }
  }

  /* Build topic + child objects */
  const topics = [];
  const childSet = new Set();
  for (const n of nodes) {
    if (n.type === "subtopic") {
      childSet.add(n.id);
      continue;
    }
    const sid = stableIdFor(n);
    const md = contentByNodeId[n.id] || "";
    topics.push({
      id: sid,
      nodeId: n.id,
      title: n.data?.label?.trim() || sid,
      description: md ? parseDescription(md) : "",
      difficulty: 1,
      estHours: 2.0,
      y: n.position?.y ?? 0,
      children: [],
      resources: parseResources(md),
    });
  }

  const topicByStable = {};
  for (const t of topics) topicByStable[t.id] = t;

  for (const n of nodes) {
    if (n.type !== "subtopic") continue;
    const sid = stableIdFor(n);
    const parentSlug = parentOf[n.id];
    const parent = parentSlug && topicByStable[parentSlug];
    const md = contentByNodeId[n.id] || "";
    const child = {
      id: sid,
      title: n.data?.label?.trim() || sid,
      description: md ? parseDescription(md) : "",
      difficulty: 1,
      estHours: 1.0,
      resources: parseResources(md),
    };
    if (parent) parent.children.push(child);
    else {
      /* orphan subtopic → promote to top-level topic */
      topicByStable[sid] = {
        id: sid,
        title: child.title,
        description: child.description,
        difficulty: 1,
        estHours: 1.0,
        y: n.position?.y ?? 0,
        children: [],
        resources: child.resources,
      };
      topics.push(topicByStable[sid]);
    }
  }

  /* sort topics + children by vertical position for a sensible default order */
  topics.sort((a, b) => (a.y ?? 0) - (b.y ?? 0));
  topics.forEach((t, i) => {
    t.sortOrder = i;
    delete t.y;
    delete t.nodeId;
  });

  /* Fallback: if the graph had no topic/subtopic nodes (e.g. golang which
     uses a redirect button), build a flat topic list from content files. */
  if (topics.length === 0 && Object.keys(contentByNodeId).length > 0) {
    const contentSlugs = Object.entries(contentByNodeId)
      .map(([nodeId, md]) => {
        const f = contentFiles.find((fn) => fn.includes(`@${nodeId}`));
        const slug = f ? f.slice(0, f.lastIndexOf("@")) : slugify(md.match(/^#\s+(.*)/m)?.[1] || nodeId);
        return { nodeId, slug, md };
      })
      .sort((a, b) => a.slug.localeCompare(b.slug));

    for (const { slug, md } of contentSlugs) {
      const title = md.match(/^#\s+(.*)/m)?.[1]?.trim() || slug;
      topics.push({
        id: slug,
        title,
        description: parseDescription(md),
        difficulty: 1,
        estHours: 2.0,
        sortOrder: topics.length,
        children: [],
        resources: parseResources(md),
      });
    }
  }

  /* edges: only between content nodes, skip parent→child (contains) edges */
  const childIds = new Set(nodes.filter((n) => n.type === "subtopic").map((n) => nodeIdToStable[n.id]));
  const edges = [];
  const seenEdge = new Set();
  for (const e of graph.edges || []) {
    const s = nodeById[e.source];
    const t = nodeById[e.target];
    if (!s || !t) continue;
    const fromSid = nodeIdToStable[e.source];
    const toSid = nodeIdToStable[e.target];
    if (!fromSid || !toSid || fromSid === toSid) continue;
    /* skip hierarchy (parent→child) edges */
    if (parentOf[e.target] === fromSid) continue;
    if (parentOf[e.source] === toSid) continue;
    const key = `${fromSid}>${toSid}`;
    if (seenEdge.has(key)) continue;
    seenEdge.add(key);
    edges.push({
      from: fromSid,
      to: toSid,
      type: e.data?.edgeStyle === "dashed" ? "related" : "prerequisite",
    });
  }

  /* projects linked to this roadmap */
  const projects = loadProjects(repo, key);

  /* questions for this roadmap (if a question-group exists) */
  const questions = loadQuestions(repo, key);

  return {
    schemaVersion: "1.0",
    source: {
      id: "roadmap.sh",
      sourceRoadmapId: key,
      url: `https://roadmap.sh/${key}`,
      extractedAt: new Date().toISOString(),
    },
    roadmap: {
      key,
      title: frontmatter.title || key,
      description: frontmatter.description || frontmatter.briefDescription || body.slice(0, 200),
      category: categoryFor(frontmatter.title || key, frontmatter.tags || []),
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
      colorTheme: colorFor(frontmatter.tags || []),
      metadata: {
        order: frontmatter.order ?? null,
        hasTopics: frontmatter.hasTopics ?? true,
        relatedRoadmaps: frontmatter.relatedRoadmaps || [],
      },
    },
    topics,
    edges,
    projects,
    questions,
  };
}

function loadProjects(repo, key) {
  const dir = path.join(repo, "src/data/projects");
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    try {
      const { frontmatter, body } = parseFrontmatter(path.join(dir, f));
      const ids = frontmatter.roadmapIds || [];
      if (!ids.includes(key)) continue;
      const diffMap = { beginner: 1, intermediate: 2, advanced: 3 };
      out.push({
        title: frontmatter.title || f.replace(/\.md$/, ""),
        description: frontmatter.description || "",
        difficulty: diffMap[frontmatter.difficulty] || 1,
        skills: frontmatter.skills || [],
        url: `https://roadmap.sh/projects/${f.replace(/\.md$/, "")}`,
      });
    } catch {
      /* skip malformed */
    }
  }
  return out;
}

function loadQuestions(repo, key) {
  const dir = path.join(repo, "src/data/question-groups", key);
  const mdFile = path.join(dir, `${key}.md`);
  if (!fs.existsSync(mdFile)) return [];
  try {
    const { frontmatter } = parseFrontmatter(mdFile);
    const qs = frontmatter.questions || [];
    const out = [];
    for (const q of qs) {
      out.push({
        question: q.question || "",
        answer: q.answer || "",
        topics: q.topics || [],
      });
    }
    return out;
  } catch {
    return [];
  }
}

function main() {
  const { repo, out, roadmaps } = parseArgs();
  fs.mkdirSync(out, { recursive: true });
  let ok = 0;
  let skip = 0;
  for (const key of roadmaps) {
    try {
      const ir = loadRoadmap(repo, key);
      if (!ir) {
        console.warn(`  skip  ${key} (not found in repo)`);
        skip++;
        continue;
      }
      const dest = path.join(out, `${key}.json`);
      fs.writeFileSync(dest, JSON.stringify(ir, null, 2) + "\n", "utf8");
      const tCount = ir.topics.length;
      const cCount = ir.topics.reduce((a, t) => a + t.children.length, 0);
      const rCount = ir.topics.reduce(
        (a, t) => a + t.resources.length + t.children.reduce((b, c) => b + c.resources.length, 0),
        0,
      );
      console.log(
        `  ok    ${key.padEnd(20)} ${String(tCount).padStart(3)} topics / ${String(cCount).padStart(3)} subtopics / ${String(rCount).padStart(3)} resources / ${ir.edges.length} edges`,
      );
      ok++;
    } catch (err) {
      console.error(`  FAIL  ${key}: ${err.message}`);
      skip++;
    }
  }
  console.log(`\nDone: ${ok} roadmaps extracted, ${skip} skipped → ${path.resolve(out)}`);
}

main();
