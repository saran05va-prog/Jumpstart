package com.jumpstart.goal;

import com.jumpstart.goal.dto.GoalChecklistItemRequest;
import com.jumpstart.goal.dto.GoalChecklistItemResponse;
import com.jumpstart.security.SecurityUser;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/goals/{goalId}/checklist")
@RequiredArgsConstructor
@Tag(name = "Goal Checklist", description = "Checklist items under a goal")
public class GoalChecklistController {

    private final GoalChecklistService checklistService;

    @GetMapping
    public ResponseEntity<List<GoalChecklistItemResponse>> list(@PathVariable Long goalId, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(checklistService.list(goalId, principal.getId(), principal.getUser().getRole()));
    }

    @PostMapping
    public ResponseEntity<GoalChecklistItemResponse> create(@PathVariable Long goalId, @Valid @RequestBody GoalChecklistItemRequest request, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(checklistService.create(goalId, request, principal.getId(), principal.getUser().getRole()));
    }

    @PatchMapping("/{itemId}")
    public ResponseEntity<GoalChecklistItemResponse> update(@PathVariable Long goalId, @PathVariable Long itemId, @Valid @RequestBody GoalChecklistItemRequest request, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(checklistService.update(itemId, request, principal.getId(), principal.getUser().getRole()));
    }

    @DeleteMapping("/{itemId}")
    public ResponseEntity<Void> delete(@PathVariable Long goalId, @PathVariable Long itemId, @AuthenticationPrincipal SecurityUser principal) {
        checklistService.delete(itemId, principal.getId(), principal.getUser().getRole());
        return ResponseEntity.noContent().build();
    }
}
