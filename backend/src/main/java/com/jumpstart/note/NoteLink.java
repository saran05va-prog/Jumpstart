package com.jumpstart.note;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Materialised [[wikilink]] extracted from note content.
 *
 * <p>Source is the note containing the link; target is the note it points
 * to (nullable when the link text doesn't match any existing note title —
 * an "unresolved" link, just like Obsidian). Backlinks are the reverse:
 * notes whose {@code source} is the current note's {@code target}.
 */
@Entity
@Table(name = "note_links")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NoteLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "source_note_id", nullable = false)
    private Note source;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_note_id")
    private Note target;

    @Column(name = "link_text", nullable = false, length = 200)
    private String linkText;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
