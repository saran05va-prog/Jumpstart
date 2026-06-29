package com.jumpstart.templates;

import com.jumpstart.roadmap.dto.RoadmapResponse;
import com.jumpstart.security.SecurityUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "Templates", description = "Roadmap starter templates inspired by roadmap.sh")
public class RoadmapTemplateController {

    private final RoadmapTemplateService templateService;

    @GetMapping("/api/templates")
    @Operation(summary = "List available roadmap templates")
    public ResponseEntity<List<Map<String, Object>>> list() {
        return ResponseEntity.ok(templateService.listTemplates());
    }

    @GetMapping("/api/templates/{key}")
    @Operation(summary = "Preview a specific template's topics and structure")
    public ResponseEntity<Map<String, Object>> preview(@PathVariable String key) {
        return ResponseEntity.ok(templateService.getTemplatePreview(key));
    }

    @PostMapping("/api/templates/{key}/import")
    @Operation(summary = "Import a template as a new roadmap for the current user")
    public ResponseEntity<RoadmapResponse> importTemplate(
            @PathVariable String key,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(templateService.importTemplate(key, principal.getId()));
    }
}
