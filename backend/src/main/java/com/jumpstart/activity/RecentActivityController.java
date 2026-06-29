package com.jumpstart.activity;

import com.jumpstart.activity.dto.RecentActivityResponse;
import com.jumpstart.security.SecurityUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/recent-activity")
@RequiredArgsConstructor
@Tag(name = "Recent Activity", description = "User activity feed")
public class RecentActivityController {

    private final RecentActivityService recentActivityService;

    @GetMapping
    @Operation(summary = "List recent activity for the current user")
    public ResponseEntity<List<RecentActivityResponse>> list(
            @RequestParam(defaultValue = "30") int limit,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(recentActivityService.list(principal.getId(), limit));
    }
}
