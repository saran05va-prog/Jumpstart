package com.jumpstart.roadmap;

import com.jumpstart.common.dto.PageResponse;
import com.jumpstart.roadmap.dto.RoadmapRequest;
import com.jumpstart.roadmap.dto.RoadmapResponse;
import com.jumpstart.security.SecurityUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/roadmaps")
@RequiredArgsConstructor
@Tag(name = "Roadmaps", description = "Structured, ordered learning paths")
public class RoadmapController {

    private final RoadmapService roadmapService;

    @PostMapping
    @Operation(summary = "Create a roadmap owned by the current user")
    public ResponseEntity<RoadmapResponse> create(@Valid @RequestBody RoadmapRequest request, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roadmapService.create(request, principal.getId()));
    }

    @GetMapping
    @Operation(summary = "List the current user's roadmaps, with optional tag/archived filters, sorting and pagination")
    public ResponseEntity<PageResponse<RoadmapResponse>> list(
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) Boolean archived,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(roadmapService.list(principal.getId(), tag, archived, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoadmapResponse> get(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(roadmapService.get(id, principal.getId(), principal.getUser().getRole()));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<RoadmapResponse> update(
            @PathVariable Long id, @Valid @RequestBody RoadmapRequest request, @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(roadmapService.update(id, request, principal.getId(), principal.getUser().getRole()));
    }

    @PatchMapping("/{id}/archive")
    @Operation(summary = "Archive or unarchive a roadmap")
    public ResponseEntity<RoadmapResponse> archive(
            @PathVariable Long id, @RequestParam boolean value, @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(roadmapService.setArchived(id, value, principal.getId(), principal.getUser().getRole()));
    }

    @PostMapping("/{id}/clone")
    @Operation(summary = "Duplicate a roadmap and all of its topics")
    public ResponseEntity<RoadmapResponse> clone(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roadmapService.clone(id, principal.getId(), principal.getUser().getRole()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        roadmapService.delete(id, principal.getId(), principal.getUser().getRole());
        return ResponseEntity.noContent().build();
    }
}
