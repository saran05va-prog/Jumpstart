package com.jumpstart.project;

import com.jumpstart.project.dto.ProjectRequest;
import com.jumpstart.project.dto.ProjectResponse;
import com.jumpstart.security.SecurityUser;
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
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@Tag(name = "Projects", description = "Hands-on projects tied to topics and roadmaps")
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    @Operation(summary = "Create a project")
    public ResponseEntity<ProjectResponse> create(
            @Valid @RequestBody ProjectRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projectService.create(request, principal.getId()));
    }

    @GetMapping
    @Operation(summary = "List projects, optionally filtered by roadmap or topic")
    public ResponseEntity<List<ProjectResponse>> list(
            @RequestParam(required = false) Long roadmapId,
            @RequestParam(required = false) Long topicId,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(projectService.list(principal.getId(), roadmapId, topicId));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update a project")
    public ResponseEntity<ProjectResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ProjectRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(projectService.update(id, request, principal.getId(), principal.getUser().getRole()));
    }

    @PatchMapping("/{id}/toggle")
    @Operation(summary = "Toggle project completion")
    public ResponseEntity<ProjectResponse> toggleCompleted(
            @PathVariable Long id,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(projectService.toggleCompleted(id, principal.getId(), principal.getUser().getRole()));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a project")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        projectService.delete(id, principal.getId(), principal.getUser().getRole());
        return ResponseEntity.noContent().build();
    }
}
