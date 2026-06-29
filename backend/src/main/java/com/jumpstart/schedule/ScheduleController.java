package com.jumpstart.schedule;

import com.jumpstart.schedule.dto.*;
import com.jumpstart.security.SecurityUser;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/schedule")
@RequiredArgsConstructor
@Tag(name = "Schedule", description = "Weekly study schedule")
public class ScheduleController {

    private final ScheduleService scheduleService;

    @GetMapping
    public ResponseEntity<List<ScheduleItemResponse>> getWeek(
            @RequestParam(required = false) String weekStart,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        LocalDate start = weekStart != null ? LocalDate.parse(weekStart) : LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        return ResponseEntity.ok(scheduleService.getWeek(principal.getId(), start));
    }

    @PostMapping
    public ResponseEntity<ScheduleItemResponse> create(
            @Valid @RequestBody ScheduleRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(scheduleService.create(request, principal.getId(), principal.getUser().getRole()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ScheduleItemResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ScheduleRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(scheduleService.update(id, request, principal.getId(), principal.getUser().getRole()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        scheduleService.delete(id, principal.getId(), principal.getUser().getRole());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/auto")
    public ResponseEntity<AutoSchedulePreview> previewAuto(@AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(scheduleService.previewAuto(principal.getId()));
    }

    @PostMapping("/auto/plan")
    public ResponseEntity<AutoSchedulePreview> previewAutoPlan(
            @RequestBody @Valid AutoPlanRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(scheduleService.previewAutoPlan(principal.getId(), request));
    }

    @PostMapping("/auto/plan/confirm")
    public ResponseEntity<List<ScheduleItemResponse>> confirmAutoPlan(
            @RequestBody @Valid AutoPlanRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(scheduleService.confirmAutoPlan(principal.getId(), request, principal.getUser().getRole()));
    }

    @PostMapping("/auto/confirm")
    public ResponseEntity<List<ScheduleItemResponse>> confirmAuto(@AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(scheduleService.confirmAuto(principal.getId(), principal.getUser().getRole()));
    }

    @GetMapping("/stats")
    public ResponseEntity<List<ScheduleStatsResponse>> getStats(
            @RequestParam(required = false) String weekStart,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        LocalDate start = weekStart != null ? LocalDate.parse(weekStart) : LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        return ResponseEntity.ok(scheduleService.getStats(principal.getId(), start));
    }

    @GetMapping("/export.ics")
    public ResponseEntity<String> exportIcs(
            @RequestParam(required = false) String weekStart,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        LocalDate start = weekStart != null ? LocalDate.parse(weekStart) : LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        List<ScheduleItemResponse> items = scheduleService.getWeek(principal.getId(), start);
        StringBuilder ics = new StringBuilder();
        ics.append("BEGIN:VCALENDAR\n");
        ics.append("VERSION:2.0\n");
        ics.append("PRODID:-//Jumpstart//Learning OS//EN\n");
        for (ScheduleItemResponse item : items) {
            ics.append("BEGIN:VEVENT\n");
            ics.append("UID:").append(item.id()).append("@jumpstart\n");
            ics.append("DTSTART:").append(item.scheduledDate().toString().replace("-", "")).append("T090000Z\n");
            ics.append("DURATION:PT").append(item.plannedMinutes()).append("M\n");
            ics.append("SUMMARY:\uD83D\uDCDA ").append(item.topicTitle()).append("\n");
            ics.append("DESCRIPTION:Jumpstart study session\n");
            ics.append("URL:https://jumpstart.app/roadmap\n");
            ics.append("END:VEVENT\n");
        }
        ics.append("END:VCALENDAR\n");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "text/calendar; charset=utf-8")
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"jumpstart-week.ics\"")
                .body(ics.toString());
    }
}
