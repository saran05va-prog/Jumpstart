package com.jumpstart.goal;

import com.jumpstart.common.dto.PageResponse;
import com.jumpstart.goal.dto.GoalRequest;
import com.jumpstart.goal.dto.GoalResponse;
import com.jumpstart.schedule.dto.ScheduleItemResponse;
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
@RequestMapping("/api/goals")
@RequiredArgsConstructor
@Tag(name = "Goals", description = "Daily, weekly, monthly and long-term targets")
public class GoalController {

    private final GoalService goalService;

    @PostMapping
    public ResponseEntity<GoalResponse> create(@Valid @RequestBody GoalRequest request, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(goalService.create(request, principal.getId()));
    }

    @GetMapping
    public ResponseEntity<PageResponse<GoalResponse>> list(
            @RequestParam(required = false) Cadence cadence,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long topicId,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(goalService.list(principal.getId(), cadence, status, topicId, pageable));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<GoalResponse> update(
            @PathVariable Long id, @Valid @RequestBody GoalRequest request, @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(goalService.update(id, request, principal.getId(), principal.getUser().getRole()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        goalService.delete(id, principal.getId(), principal.getUser().getRole());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/today-schedule")
    public ResponseEntity<List<ScheduleItemResponse>> todaySchedule(@AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(goalService.getTodaySchedule(principal.getId()));
    }

    @PostMapping("/from-schedule/{topicId}")
    public ResponseEntity<GoalResponse> createFromSchedule(
            @PathVariable Long topicId,
            @RequestParam String title,
            @RequestParam int minutes,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(goalService.createDailyFromSchedule(principal.getId(), topicId, title, minutes));
    }
}
