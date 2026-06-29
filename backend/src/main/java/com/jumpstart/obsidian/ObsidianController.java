package com.jumpstart.obsidian;

import com.jumpstart.common.exception.ForbiddenException;
import com.jumpstart.common.exception.ResourceNotFoundException;
import com.jumpstart.note.Note;
import com.jumpstart.note.NoteRepository;
import com.jumpstart.note.dto.ObsidianLinkRequest;
import com.jumpstart.note.dto.NoteResponse;
import com.jumpstart.obsidian.dto.*;
import com.jumpstart.security.SecurityUser;
import com.jumpstart.topic.Topic;
import com.jumpstart.topic.TopicRepository;
import com.jumpstart.user.settings.SettingsService;
import com.jumpstart.user.settings.dto.UserSettingsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Obsidian", description = "Obsidian vault integration — bidirectional sync, file watching, markdown")
public class ObsidianController {

    private final SettingsService settingsService;
    private final NoteRepository noteRepository;
    private final TopicRepository topicRepository;
    private final VaultSyncService vaultSyncService;

    @PutMapping("/settings/obsidian")
    @Operation(summary = "Save Obsidian vault name and optional path")
    public ResponseEntity<UserSettingsResponse> saveVault(
            @RequestBody @Valid ObsidianVaultRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(settingsService.saveVaultConfig(
                request.vaultName(), request.vaultPath(), principal.getId()));
    }

    @GetMapping("/settings/obsidian")
    @Operation(summary = "Get Obsidian vault settings")
    public ResponseEntity<UserSettingsResponse> getVault(
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(settingsService.get(principal.getId()));
    }

    @PostMapping("/settings/obsidian/verify")
    @Operation(summary = "Verify vault connection and return stats")
    public ResponseEntity<VerifyConnectionResponse> verifyConnection(
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(vaultSyncService.verifyConnection(principal.getId()));
    }

    @GetMapping("/settings/obsidian/sync-status")
    @Operation(summary = "Get sync status with counts")
    public ResponseEntity<SyncStatusResponse> syncStatus(
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(vaultSyncService.getSyncStatus(principal.getId()));
    }

    @PostMapping("/settings/obsidian/sync-now")
    @Operation(summary = "Force sync all notes to vault")
    public ResponseEntity<Map<String, String>> syncNow(
            @AuthenticationPrincipal SecurityUser principal
    ) {
        vaultSyncService.syncAll(principal.getId());
        return ResponseEntity.ok(Map.of("status", "synced"));
    }

    @PostMapping("/settings/obsidian/enable-sync")
    @Operation(summary = "Enable vault sync")
    public ResponseEntity<Map<String, String>> enableSync(
            @AuthenticationPrincipal SecurityUser principal
    ) {
        settingsService.enableSync(principal.getId(), true);
        return ResponseEntity.ok(Map.of("status", "sync_enabled"));
    }

    @PostMapping("/settings/obsidian/disable-sync")
    @Operation(summary = "Disable vault sync")
    public ResponseEntity<Map<String, String>> disableSync(
            @AuthenticationPrincipal SecurityUser principal
    ) {
        settingsService.enableSync(principal.getId(), false);
        return ResponseEntity.ok(Map.of("status", "sync_disabled"));
    }

    @PutMapping("/notes/{noteId}/obsidian")
    @Operation(summary = "Update Obsidian file reference for a note")
    public ResponseEntity<NoteResponse> updateObsidianFields(
            @PathVariable Long noteId,
            @RequestBody @Valid ObsidianNoteLinkRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Note", noteId));
        if (!note.getOwner().getId().equals(principal.getId())) {
            throw new ForbiddenException("Not your note");
        }
        note.setObsidianUri(request.obsidianUri());
        note.setObsidianFile(request.obsidianFile());
        return ResponseEntity.ok(NoteResponse.from(noteRepository.save(note)));
    }

    @GetMapping("/notes/{noteId}/conflict")
    @Operation(summary = "Get conflict data for a note")
    public ResponseEntity<?> getConflict(
            @PathVariable Long noteId,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Note", noteId));
        if (!note.getOwner().getId().equals(principal.getId()))
            throw new ForbiddenException("Not your note");
        if (!"CONFLICT".equals(note.getSyncStatus()))
            return ResponseEntity.ok(Map.of("hasConflict", false));
        return ResponseEntity.ok(Map.of(
                "hasConflict", true,
                "noteId", note.getId(),
                "jumpstartContent", note.getContent() != null ? note.getContent() : "",
                "obsidianContent", note.getConflictContent() != null ? note.getConflictContent() : "",
                "title", note.getTitle(),
                "detectedAt", note.getConflictDetectedAt() != null ? note.getConflictDetectedAt().toString() : null
        ));
    }

    @PostMapping("/notes/{noteId}/resolve-conflict")
    @Operation(summary = "Resolve a sync conflict")
    public ResponseEntity<NoteResponse> resolveConflict(
            @PathVariable Long noteId,
            @RequestBody @Valid ConflictResolutionRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        Note note = vaultSyncService.resolveConflict(
                noteId, principal.getId(), request.resolution(), request.mergedContent());
        if (note == null) throw new ResourceNotFoundException("Note", noteId);
        return ResponseEntity.ok(NoteResponse.from(note));
    }

    @PostMapping("/webhooks/obsidian")
    @Transactional
    @Operation(summary = "Webhook receiver for Obsidian plugin")
    public ResponseEntity<Void> webhookReceive(
            @RequestBody @Valid ObsidianLinkRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        Topic topic = topicRepository.findByIdWithRoadmapAndOwner(request.topicId())
                .orElseThrow(() -> new ResourceNotFoundException("Topic", request.topicId()));
        if (!topic.getRoadmap().getOwner().getId().equals(principal.getId())) {
            throw new ForbiddenException("Not your topic");
        }
        Note note = noteRepository.findByTopicIdAndOwnerId(request.topicId(), principal.getId())
                .orElse(null);
        if (note == null) {
            note = Note.builder()
                    .owner(principal.getUser())
                    .topic(topic)
                    .roadmap(topic.getRoadmap())
                    .title(topic.getTitle() + " notes")
                    .content(request.content())
                    .obsidianFile(request.vaultFile())
                    .tags(List.of())
                    .build();
        } else {
            note.setContent(request.content());
            note.setObsidianFile(request.vaultFile());
        }
        noteRepository.save(note);
        return ResponseEntity.ok().build();
    }
}

record ObsidianNoteLinkRequest(String obsidianUri, String obsidianFile) {}
