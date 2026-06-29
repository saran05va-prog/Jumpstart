package com.jumpstart.note;

import com.jumpstart.note.dto.BacklinkResponse;
import com.jumpstart.note.dto.NoteRequest;
import com.jumpstart.note.dto.NoteResponse;
import com.jumpstart.security.SecurityUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
@Tag(name = "Notes", description = "Markdown notes with [[wikilinks]], backlinks, auto-save, pinning")
public class NoteController {

    private final NoteService noteService;

    @PostMapping
    public ResponseEntity<NoteResponse> create(@Valid @RequestBody NoteRequest request, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(noteService.create(request, principal.getId()));
    }

    @GetMapping
    @Operation(summary = "List notes, optionally filtered by topic, roadmap, starred, pinned, or search query")
    public ResponseEntity<List<NoteResponse>> list(
            @RequestParam(required = false) Long topicId,
            @RequestParam(required = false) Long roadmapId,
            @RequestParam(required = false) Boolean starred,
            @RequestParam(required = false) Boolean pinned,
            @RequestParam(required = false) String q,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(noteService.listAll(principal.getId(), topicId, roadmapId, starred, pinned, q));
    }

    @GetMapping("/recent")
    @Operation(summary = "Recently edited notes")
    public ResponseEntity<List<NoteResponse>> recent(
            @RequestParam(defaultValue = "10") int limit,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(noteService.recent(principal.getId(), limit));
    }

    @GetMapping("/recently-viewed")
    @Operation(summary = "Recently viewed notes (by lastViewedAt)")
    public ResponseEntity<List<NoteResponse>> recentlyViewed(
            @RequestParam(defaultValue = "10") int limit,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(noteService.recentlyViewed(principal.getId(), limit));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NoteResponse> getById(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(noteService.getById(id, principal.getId(), principal.getUser().getRole()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NoteResponse> update(
            @PathVariable Long id, @Valid @RequestBody NoteRequest request, @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(noteService.update(id, request, principal.getId(), principal.getUser().getRole()));
    }

    @PatchMapping("/{id}/pin")
    @Operation(summary = "Toggle pin status")
    public ResponseEntity<NoteResponse> togglePin(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(noteService.togglePin(id, principal.getId(), principal.getUser().getRole()));
    }

    @PatchMapping("/{id}/star")
    @Operation(summary = "Toggle star status")
    public ResponseEntity<NoteResponse> toggleStar(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(noteService.toggleStar(id, principal.getId(), principal.getUser().getRole()));
    }

    @PostMapping("/{id}/duplicate")
    @Operation(summary = "Duplicate a note")
    public ResponseEntity<NoteResponse> duplicate(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(noteService.duplicate(id, principal.getId(), principal.getUser().getRole()));
    }

    @GetMapping("/{id}/backlinks")
    @Operation(summary = "Notes that link TO this note via [[wikilinks]]")
    public ResponseEntity<List<BacklinkResponse>> backlinks(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(noteService.backlinks(id, principal.getId(), principal.getUser().getRole()));
    }

    @GetMapping(value = "/{id}/export", produces = MediaType.TEXT_PLAIN_VALUE)
    @Operation(summary = "Export note as raw markdown")
    public ResponseEntity<String> export(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        NoteResponse note = noteService.getById(id, principal.getId(), principal.getUser().getRole());
        String md = "# " + note.title() + "\n\n" + (note.content() != null ? note.content() : "");
        return ResponseEntity.ok(md);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        noteService.delete(id, principal.getId(), principal.getUser().getRole());
        return ResponseEntity.noContent().build();
    }
}
