package com.jumpstart.resource;

import com.jumpstart.common.dto.PageResponse;
import com.jumpstart.resource.dto.ResourceRequest;
import com.jumpstart.resource.dto.ResourceResponse;
import com.jumpstart.resource.dto.TagCount;
import com.jumpstart.resource.dto.TopicResourceGroup;
import com.jumpstart.security.SecurityUser;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
@Tag(name = "Resources", description = "Saved links, videos, docs, files and other study material")
public class ResourceController {

    private final ResourceService resourceService;

    @PostMapping
    public ResponseEntity<ResourceResponse> create(@Valid @RequestBody ResourceRequest request, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(resourceService.create(request, principal.getId()));
    }

    @GetMapping
    public ResponseEntity<PageResponse<ResourceResponse>> list(
            @RequestParam(required = false) ResourceType type,
            @RequestParam(required = false) Boolean bookmarked,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long topicId,
            @RequestParam(required = false) Long roadmapId,
            @RequestParam(required = false) Boolean completed,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) ResourceStatus status,
            @RequestParam(required = false) Boolean favorite,
            @RequestParam(required = false) Boolean hidden,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(resourceService.list(principal.getId(), type, bookmarked, q, topicId, roadmapId, completed, tag, status, favorite, hidden, pageable));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ResourceResponse> update(
            @PathVariable Long id, @Valid @RequestBody ResourceRequest request, @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(resourceService.update(id, request, principal.getId(), principal.getUser().getRole()));
    }

    @PatchMapping("/{id}/bookmark")
    public ResponseEntity<ResourceResponse> toggleBookmark(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(resourceService.toggleBookmark(id, principal.getId(), principal.getUser().getRole()));
    }

    @PatchMapping("/{id}/favorite")
    public ResponseEntity<ResourceResponse> toggleFavorite(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(resourceService.toggleFavorite(id, principal.getId(), principal.getUser().getRole()));
    }

    /**
     * Quick-complete cycle: one click advances NOT_STARTED → IN_PROGRESS →
     * COMPLETED → NOT_STARTED. Returns the updated resource with new status.
     */
    @PatchMapping("/{id}/cycle")
    public ResponseEntity<ResourceResponse> cycleStatus(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(resourceService.cycleStatus(id, principal.getId(), principal.getUser().getRole()));
    }

    @PatchMapping("/{id}/complete")
    public ResponseEntity<ResourceResponse> toggleCompleted(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(resourceService.cycleStatus(id, principal.getId(), principal.getUser().getRole()));
    }

    /**
     * Explicit status + progress set (video position, page number, percent).
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ResourceResponse> setStatus(
            @PathVariable Long id,
            @RequestParam ResourceStatus status,
            @RequestParam(required = false) Integer progressPercent,
            @RequestParam(required = false) Integer videoPositionSeconds,
            @RequestParam(required = false) Integer lastPage,
            @RequestParam(required = false) Double readingProgress,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(resourceService.setStatus(id, status, progressPercent, videoPositionSeconds, lastPage, readingProgress, principal.getId(), principal.getUser().getRole()));
    }

    @GetMapping("/by-topic")
    public ResponseEntity<List<TopicResourceGroup>> listByTopic(
            @RequestParam Long roadmapId,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(resourceService.getByTopic(roadmapId, principal.getId()));
    }

    @GetMapping("/tags")
    public ResponseEntity<List<TagCount>> listTags(@AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(resourceService.getTagCounts(principal.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        resourceService.delete(id, principal.getId(), principal.getUser().getRole());
        return ResponseEntity.noContent().build();
    }
}
