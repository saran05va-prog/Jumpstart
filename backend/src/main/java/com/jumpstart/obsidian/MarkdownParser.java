package com.jumpstart.obsidian;

import org.springframework.stereotype.Component;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class MarkdownParser {

    private static final Pattern FRONTMATTER_PATTERN = Pattern.compile(
            "^---\\s*\\n(.*?)\\n(?:---|\\.\\.\\.)\\s*\\n", Pattern.DOTALL);
    private static final Pattern TAG_PATTERN = Pattern.compile(
            "(?<![\\w`])#(\\w[\\w/.-]*)");
    private static final Pattern WIKILINK_PATTERN = Pattern.compile(
            "\\[\\[([^\\]]+)]]");
    private static final Pattern EMBED_PATTERN = Pattern.compile(
            "!\\[\\[([^\\]]+)]]");
    private static final Pattern IMAGE_PATTERN = Pattern.compile(
            "!\\[([^\\]]*)\\]\\(([^)]+)\\)");
    private static final Pattern MARKDOWN_HEADING = Pattern.compile(
            "^#{1,6}\\s+(.+)$", Pattern.MULTILINE);
    private static final Pattern CHECKLIST_ITEM = Pattern.compile(
            "^[-*+] \\[([ xX])] .*$", Pattern.MULTILINE);
    private static final Pattern CODE_FENCE = Pattern.compile(
            "^```(\\w*)\\s*$", Pattern.MULTILINE);
    private static final Pattern MERMAID_FENCE = Pattern.compile(
            "^```mermaid\\s*$", Pattern.MULTILINE);

    public record ParsedNote(
            String title,
            String content,
            String rawFrontmatter,
            Map<String, String> frontmatter,
            List<String> tags,
            List<String> wikilinks,
            List<String> embeds,
            List<String> images,
            int checklistTotal,
            int checklistCompleted,
            boolean hasMermaid,
            String checksum
    ) {}

    public ParsedNote parse(String markdown) {
        String rawFrontmatter = "";
        Map<String, String> frontmatter = new LinkedHashMap<>();
        String body = markdown;

        Matcher fmMatcher = FRONTMATTER_PATTERN.matcher(markdown);
        if (fmMatcher.find()) {
            rawFrontmatter = fmMatcher.group(1);
            body = markdown.substring(fmMatcher.end());
            parseYamlLines(rawFrontmatter, frontmatter);
        }

        String title = frontmatter.getOrDefault("title", extractTitleFromBody(body));

        List<String> tags = extractTags(body);
        String fmTagsRaw = frontmatter.get("tags");
        if (fmTagsRaw != null) {
            for (String t : fmTagsRaw.split(",\\s*")) {
                String clean = t.trim().replaceAll("[\\[\\]\"'\\-]", "");
                if (!clean.isEmpty() && !tags.contains(clean)) tags.add(clean);
            }
        }

        List<String> wikilinks = extractWikilinks(body);
        List<String> embeds = extractEmbeds(body);
        List<String> images = extractImages(body);

        int checklistTotal = 0, checklistCompleted = 0;
        Matcher clMatcher = CHECKLIST_ITEM.matcher(body);
        while (clMatcher.find()) {
            checklistTotal++;
            String status = clMatcher.group(1);
            if ("x".equalsIgnoreCase(status)) checklistCompleted++;
        }

        boolean hasMermaid = MERMAID_FENCE.matcher(body).find();

        String checksum = sha256(markdown);

        return new ParsedNote(title, body, rawFrontmatter, frontmatter,
                tags, wikilinks, embeds, images,
                checklistTotal, checklistCompleted, hasMermaid, checksum);
    }

    private void parseYamlLines(String yaml, Map<String, String> map) {
        for (String line : yaml.split("\\n")) {
            if (line.trim().startsWith("- ")) continue;
            int colonIdx = line.indexOf(':');
            if (colonIdx > 0) {
                String key = line.substring(0, colonIdx).trim();
                String value = line.substring(colonIdx + 1).trim();
                if (value.startsWith("\"") && value.endsWith("\""))
                    value = value.substring(1, value.length() - 1);
                else if (value.startsWith("'") && value.endsWith("'"))
                    value = value.substring(1, value.length() - 1);
                if (value.startsWith("[") && value.endsWith("]"))
                    value = value.substring(1, value.length() - 1).trim();
                map.put(key, value);
            }
        }
    }

    public String toMarkdown(String title, String content, List<String> tags,
                              Long jumpstartId, String roadmap, String topic,
                              String checksum) {
        StringBuilder sb = new StringBuilder();
        sb.append("---\n");
        sb.append("title: \"").append(escapeYaml(title)).append("\"\n");
        sb.append("jumpstart_id: ").append(jumpstartId != null ? jumpstartId : "").append("\n");
        if (roadmap != null && !roadmap.isEmpty())
            sb.append("roadmap: \"").append(escapeYaml(roadmap)).append("\"\n");
        if (topic != null && !topic.isEmpty())
            sb.append("topic: \"").append(escapeYaml(topic)).append("\"\n");
        if (tags != null && !tags.isEmpty()) {
            sb.append("tags:\n");
            for (String tag : tags) sb.append("  - ").append(tag).append("\n");
        }
        sb.append("created: ").append(LocalDate.now()).append("\n");
        if (checksum != null && !checksum.isEmpty())
            sb.append("jumpstart_checksum: ").append(checksum).append("\n");
        sb.append("---\n\n");
        sb.append(content != null ? content : "");
        return sb.toString();
    }

    public String toMarkdown(String title, String content, List<String> tags,
                              Long jumpstartId, String roadmap, String topic) {
        return toMarkdown(title, content, tags, jumpstartId, roadmap, topic, null);
    }

    public String computeChecksum(String markdown) {
        return sha256(markdown);
    }

    public List<String> extractWikilinks(String content) {
        if (content == null) return List.of();
        List<String> links = new ArrayList<>();
        Matcher m = WIKILINK_PATTERN.matcher(content);
        while (m.find()) {
            String link = m.group(1).split("\\|")[0].trim();
            if (!links.contains(link)) links.add(link);
        }
        return links;
    }

    public List<String> extractEmbeds(String content) {
        if (content == null) return List.of();
        List<String> embeds = new ArrayList<>();
        Matcher m = EMBED_PATTERN.matcher(content);
        while (m.find()) {
            String embed = m.group(1).split("\\|")[0].trim();
            if (!embeds.contains(embed)) embeds.add(embed);
        }
        return embeds;
    }

    public List<String> extractImages(String content) {
        if (content == null) return List.of();
        List<String> images = new ArrayList<>();
        Matcher m = IMAGE_PATTERN.matcher(content);
        while (m.find()) images.add(m.group(2));
        return images;
    }

    public List<String> extractTags(String content) {
        if (content == null) return List.of();
        Set<String> tags = new LinkedHashSet<>();
        Matcher m = TAG_PATTERN.matcher(content);
        while (m.find()) {
            String tag = m.group(1);
            if (!tag.matches("\\d+") && !tag.contains("://"))
                tags.add(tag);
        }
        return new ArrayList<>(tags);
    }

    private String extractTitleFromBody(String body) {
        Matcher m = MARKDOWN_HEADING.matcher(body);
        if (m.find()) return m.group(1).trim();
        return "Untitled";
    }

    public String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes());
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    private String escapeYaml(String value) {
        if (value.contains("\"") || value.contains(":") || value.contains("#"))
            return value.replace("\\", "\\\\").replace("\"", "\\\"");
        return value;
    }
}
