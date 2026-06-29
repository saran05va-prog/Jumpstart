package com.jumpstart.topic;

import com.jumpstart.security.SecurityUser;
import com.jumpstart.topic.dto.ReorderRequest;
import com.jumpstart.topic.dto.TopicRequest;
import com.jumpstart.topic.dto.TopicResponse;
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
@Tag(name = "Topics", description = "Ordered, prerequisite-style steps within a roadmap")
public class TopicController {

    private final TopicService topicService;

    @GetMapping("/api/roadmaps/{roadmapId}/topics")
    public ResponseEntity<List<TopicResponse>> list(@PathVariable Long roadmapId, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(topicService.listByRoadmap(roadmapId, principal.getId(), principal.getUser().getRole()));
    }

    @PostMapping("/api/roadmaps/{roadmapId}/topics")
    public ResponseEntity<TopicResponse> create(
            @PathVariable Long roadmapId,
            @Valid @RequestBody TopicRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        TopicResponse created = topicService.create(roadmapId, request, principal.getId(), principal.getUser().getRole());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/api/topics/{id}")
    public ResponseEntity<TopicResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody TopicRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(topicService.update(id, request, principal.getId(), principal.getUser().getRole()));
    }

    @DeleteMapping("/api/topics/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        topicService.delete(id, principal.getId(), principal.getUser().getRole());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/api/roadmaps/{roadmapId}/topics/reorder")
    public ResponseEntity<List<TopicResponse>> reorder(
            @PathVariable Long roadmapId,
            @Valid @RequestBody ReorderRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(topicService.reorder(roadmapId, request.topicOrders(), principal.getId(), principal.getUser().getRole()));
    }
}
