package com.jumpstart.topic.prerequisite;

import com.jumpstart.resource.ResourceRepository;
import com.jumpstart.security.SecurityUser;
import com.jumpstart.topic.prerequisite.dto.GraphDTO;
import com.jumpstart.topic.prerequisite.dto.PrerequisiteRequest;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Graph", description = "Topic dependency graph")
public class GraphController {

    private final GraphService graphService;

    @GetMapping("/roadmaps/{roadmapId}/graph")
    public ResponseEntity<GraphDTO> getGraph(@PathVariable Long roadmapId, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(graphService.getGraph(roadmapId, principal.getId(), principal.getUser().getRole()));
    }

    @PostMapping("/topics/{topicId}/prerequisites")
    public ResponseEntity<Void> addPrerequisite(
            @PathVariable Long topicId,
            @Valid @RequestBody PrerequisiteRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        graphService.addPrerequisite(topicId, request.prerequisiteTopicId(), principal.getId(), principal.getUser().getRole());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/topics/{topicId}/prerequisites/{prereqId}")
    public ResponseEntity<Void> removePrerequisite(
            @PathVariable Long topicId,
            @PathVariable Long prereqId,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        graphService.removePrerequisite(topicId, prereqId, principal.getId(), principal.getUser().getRole());
        return ResponseEntity.noContent().build();
    }
}
