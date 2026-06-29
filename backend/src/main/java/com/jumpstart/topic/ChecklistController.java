package com.jumpstart.topic;

import com.jumpstart.security.SecurityUser;
import com.jumpstart.topic.dto.ChecklistItemRequest;
import com.jumpstart.topic.dto.ChecklistItemResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Checklist", description = "Checklist items within topics")
public class ChecklistController {

    private final ChecklistService checklistService;

    @GetMapping("/api/topics/{topicId}/checklist")
    @Operation(summary = "List checklist items for a topic")
    public ResponseEntity<List<ChecklistItemResponse>> list(
            @PathVariable Long topicId,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(checklistService.listByTopic(topicId, principal.getId(), principal.getUser().getRole()));
    }

    @PostMapping("/api/topics/{topicId}/checklist")
    @Operation(summary = "Add a checklist item to a topic")
    public ResponseEntity<ChecklistItemResponse> create(
            @PathVariable Long topicId,
            @Valid @RequestBody ChecklistItemRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(checklistService.create(topicId, request, principal.getId(), principal.getUser().getRole()));
    }

    @PatchMapping("/api/checklist/{id}")
    @Operation(summary = "Update a checklist item")
    public ResponseEntity<ChecklistItemResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ChecklistItemRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(checklistService.update(id, request, principal.getId(), principal.getUser().getRole()));
    }

    @PatchMapping("/api/checklist/{id}/toggle")
    @Operation(summary = "Toggle checklist item completion")
    public ResponseEntity<ChecklistItemResponse> toggle(
            @PathVariable Long id,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(checklistService.toggleCompleted(id, principal.getId(), principal.getUser().getRole()));
    }

    @DeleteMapping("/api/checklist/{id}")
    @Operation(summary = "Delete a checklist item")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        checklistService.delete(id, principal.getId(), principal.getUser().getRole());
        return ResponseEntity.noContent().build();
    }
}
