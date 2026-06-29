package com.jumpstart.note;

import com.jumpstart.note.dto.BacklinkResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Parses Obsidian-style {@code [[wikilinks]]} from note content and
 * maintains the {@link NoteLink} table.
 *
 * <p>On every note save the service:
 * <ol>
 *   <li>Extracts all {@code [[link text]]} occurrences from the content</li>
 *   <li>Resolves each to an existing note by title (case-insensitive)</li>
 *   <li>Replaces the link set atomically (delete + insert)</li>
 * </ol>
 *
 * Backlinks are simply the reverse query: {@code findByTargetId}.
 */
@Service
@RequiredArgsConstructor
public class NoteLinkService {

    private static final Pattern WIKILINK = Pattern.compile("\\[\\[([^\\]]+)]][^\\]]");

    private final NoteLinkRepository noteLinkRepository;
    private final NoteRepository noteRepository;

    /**
     * Rebuilds the outgoing link set for a note. Called on every content
     * save. Idempotent — safe to call repeatedly with the same content.
     */
    @Transactional
    public void rebuildLinks(Note source) {
        noteLinkRepository.deleteBySourceId(source.getId());

        List<String> linkTexts = extractWikilinks(source.getContent());
        if (linkTexts.isEmpty()) return;

        // Resolve link texts to notes by title (case-insensitive) within the same owner
        List<Note> candidates = noteRepository.findByOwnerIdOrderByUpdatedAtDesc(source.getOwner().getId());
        Map<String, Note> titleIndex = candidates.stream()
                .collect(Collectors.toMap(
                        n -> n.getTitle().toLowerCase().trim(),
                        n -> n,
                        (a, b) -> a));

        for (String text : linkTexts) {
            Note target = titleIndex.get(text.toLowerCase().trim());
            NoteLink link = NoteLink.builder()
                    .source(source)
                    .target(target)
                    .linkText(text)
                    .build();
            noteLinkRepository.save(link);
        }
    }

    /**
     * Returns all notes that link TO the given note (backlinks).
     */
    @Transactional(readOnly = true)
    public List<BacklinkResponse> getBacklinks(Long noteId) {
        return noteLinkRepository.findByTargetId(noteId).stream()
                .map(link -> new BacklinkResponse(
                        link.getSource().getId(),
                        link.getSource().getTitle(),
                        link.getLinkText(),
                        link.getSource().getRoadmap() != null ? link.getSource().getRoadmap().getId() : null,
                        link.getSource().getTopic() != null ? link.getSource().getTopic().getId() : null))
                .toList();
    }

    /**
     * Extracts {@code [[link text]]} from markdown content. Handles
     * Obsidian's alias syntax {@code [[target|alias]]} by taking the
     * target portion before the pipe.
     */
    public static List<String> extractWikilinks(String content) {
        if (content == null || content.isBlank()) return List.of();
        List<String> links = new ArrayList<>();
        // Match [[...]] — the regex uses a lookahead-free approach: find [[ then
        // everything up to the first ]]
        Matcher m = Pattern.compile("\\[\\[([^\\]\\n]+)]]").matcher(content);
        while (m.find()) {
            String raw = m.group(1).trim();
            // Handle alias syntax [[target|display]]
            int pipe = raw.indexOf('|');
            String target = pipe >= 0 ? raw.substring(0, pipe).trim() : raw;
            if (!target.isEmpty()) {
                links.add(target);
            }
        }
        return links;
    }
}
