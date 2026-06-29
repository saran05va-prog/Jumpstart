package com.jumpstart.progress;

import com.jumpstart.progress.dto.RoadmapProgressResponse;
import com.jumpstart.progress.dto.WorkspaceResponse;
import com.jumpstart.security.SecurityUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/progress")
@RequiredArgsConstructor
@Tag(name = "Progress", description = "Progress engine: roadmap, topic, and resource completion analytics")
public class ProgressController {

    private final ProgressService progressService;

    @GetMapping("/workspace")
    @Operation(summary = "Full progress workspace: continue learning, completed today/week, roadmap & topic progress")
    public ResponseEntity<WorkspaceResponse> workspace(@AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(progressService.getWorkspace(principal.getId()));
    }

    @GetMapping("/roadmaps/{roadmapId}")
    @Operation(summary = "Detailed progress for a single roadmap including per-topic breakdown")
    public ResponseEntity<RoadmapProgressResponse> roadmapProgress(
            @PathVariable Long roadmapId,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(progressService.getRoadmapProgress(roadmapId, principal.getId()));
    }
}
