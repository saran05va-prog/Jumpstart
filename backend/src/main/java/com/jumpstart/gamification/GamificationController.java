package com.jumpstart.gamification;

import com.jumpstart.gamification.dto.*;
import com.jumpstart.security.SecurityUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/gamification")
@RequiredArgsConstructor
@Tag(name = "Gamification", description = "XP, streaks, achievements and level progression")
public class GamificationController {

    private final GamificationService gamificationService;

    @GetMapping("/dashboard")
    @Operation(summary = "Full gamification dashboard: streak, XP, achievements")
    public ResponseEntity<GamificationDashboardResponse> dashboard(@AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(gamificationService.getDashboard(principal.getId()));
    }

    @PostMapping("/activity")
    @Operation(summary = "Record daily activity, updates streak and checks achievements")
    public ResponseEntity<StreakResponse> recordActivity(@AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(gamificationService.recordActivity(principal.getId()));
    }
}
