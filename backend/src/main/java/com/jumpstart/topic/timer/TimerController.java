package com.jumpstart.topic.timer;

import com.jumpstart.security.SecurityUser;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Timer", description = "Cross-device per-topic study timer")
public class TimerController {

    private final TimerService timerService;

    @PostMapping("/topics/{topicId}/timer/start")
    public ResponseEntity<TimerStatusResponse> start(@PathVariable Long topicId, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(timerService.start(topicId, principal.getId(), principal.getUser().getRole()));
    }

    @PostMapping("/topics/{topicId}/timer/pause")
    public ResponseEntity<TimerStatusResponse> pause(@PathVariable Long topicId, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(timerService.pause(topicId, principal.getId(), principal.getUser().getRole()));
    }

    @PostMapping("/topics/{topicId}/timer/stop")
    public ResponseEntity<TimerStatusResponse> stop(@PathVariable Long topicId, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(timerService.stop(topicId, principal.getId(), principal.getUser().getRole()));
    }

    @GetMapping("/topics/{topicId}/timer/status")
    public ResponseEntity<TimerStatusResponse> status(@PathVariable Long topicId, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(timerService.status(topicId, principal.getId(), principal.getUser().getRole()));
    }

    @PostMapping("/topics/{topicId}/timer/log")
    public ResponseEntity<Void> logManual(@PathVariable Long topicId, @Valid @RequestBody TimerLogRequest request, @AuthenticationPrincipal SecurityUser principal) {
        timerService.logManual(topicId, request, principal.getId(), principal.getUser().getRole());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/topics/{topicId}/timer/history")
    public ResponseEntity<List<TopicTimerSession>> history(@PathVariable Long topicId, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(timerService.history(topicId, principal.getId(), principal.getUser().getRole()));
    }

    @GetMapping("/timer/active")
    public ResponseEntity<TimerStatusDTO> active(@AuthenticationPrincipal SecurityUser principal) {
        TimerStatusDTO active = timerService.getActive(principal.getId());
        if (active == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(active);
    }
}
