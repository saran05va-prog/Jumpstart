package com.jumpstart.topic;

import com.jumpstart.security.SecurityUser;
import com.jumpstart.topic.dto.TopicLinkRequest;
import com.jumpstart.topic.dto.TopicLinkResponse;
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
@Tag(name = "Topic Links", description = "External/Obsidian links attached to topics")
public class TopicLinkController {

    private final TopicLinkService topicLinkService;

    @GetMapping("/api/topics/{topicId}/links")
    @Operation(summary = "List links for a topic")
    public ResponseEntity<List<TopicLinkResponse>> list(
            @PathVariable Long topicId,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(topicLinkService.listByTopic(topicId, principal.getId(), principal.getUser().getRole()));
    }

    @PostMapping("/api/topics/{topicId}/links")
    @Operation(summary = "Add a link to a topic")
    public ResponseEntity<TopicLinkResponse> create(
            @PathVariable Long topicId,
            @Valid @RequestBody TopicLinkRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(topicLinkService.create(topicId, request, principal.getId(), principal.getUser().getRole()));
    }

    @PatchMapping("/api/topic-links/{id}")
    @Operation(summary = "Update a topic link")
    public ResponseEntity<TopicLinkResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody TopicLinkRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(topicLinkService.update(id, request, principal.getId(), principal.getUser().getRole()));
    }

    @DeleteMapping("/api/topic-links/{id}")
    @Operation(summary = "Delete a topic link")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        topicLinkService.delete(id, principal.getId(), principal.getUser().getRole());
        return ResponseEntity.noContent().build();
    }
}
