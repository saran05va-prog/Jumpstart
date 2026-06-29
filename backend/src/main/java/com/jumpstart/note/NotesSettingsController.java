package com.jumpstart.note;

import com.jumpstart.security.SecurityUser;
import com.jumpstart.user.settings.SettingsService;
import com.jumpstart.user.settings.dto.UserSettingsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/settings/notes")
@RequiredArgsConstructor
@Tag(name = "Notes Storage", description = "Configure local Markdown storage for notes")
public class NotesSettingsController {

    private final SettingsService settingsService;

    @GetMapping
    @Operation(summary = "Get notes storage settings")
    public ResponseEntity<UserSettingsResponse> get(
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(settingsService.get(principal.getId()));
    }

    @PutMapping
    @Operation(summary = "Save notes storage folder path")
    public ResponseEntity<UserSettingsResponse> save(
            @RequestBody NotesStorageRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(settingsService.saveNotesStoragePath(request.path(), principal.getId()));
    }

    @PostMapping("/verify")
    @Operation(summary = "Verify that the configured folder exists and is writable")
    public ResponseEntity<Map<String, Object>> verify(
            @AuthenticationPrincipal SecurityUser principal
    ) {
        try {
            settingsService.testNotesStoragePath(principal.getId());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Folder exists and is writable"
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        } catch (IOException e) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    @DeleteMapping
    @Operation(summary = "Reset notes storage path to default (unset)")
    public ResponseEntity<UserSettingsResponse> reset(
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(settingsService.saveNotesStoragePath(null, principal.getId()));
    }

    record NotesStorageRequest(String path) {}
}
