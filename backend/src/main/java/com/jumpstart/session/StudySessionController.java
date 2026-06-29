package com.jumpstart.session;

import com.jumpstart.security.SecurityUser;
import com.jumpstart.session.dto.StudySessionRequest;
import com.jumpstart.session.dto.StudySessionResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
@Tag(name = "Study Sessions", description = "Logged study time for activity tracking and streaks")
public class StudySessionController {

    private final StudySessionService sessionService;

    @PostMapping
    @Operation(summary = "Log a study session")
    public ResponseEntity<StudySessionResponse> create(
            @Valid @RequestBody StudySessionRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(sessionService.create(request, principal.getId()));
    }

    @GetMapping
    @Operation(summary = "List study sessions, optionally filtered by date range")
    public ResponseEntity<List<StudySessionResponse>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(sessionService.list(principal.getId(), from, to));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update a study session")
    public ResponseEntity<StudySessionResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody StudySessionRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(sessionService.update(id, request, principal.getId(), principal.getUser().getRole()));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a study session")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        sessionService.delete(id, principal.getId(), principal.getUser().getRole());
        return ResponseEntity.noContent().build();
    }
}
