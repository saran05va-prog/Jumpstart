package com.jumpstart.certification;

import com.jumpstart.certification.dto.CertificationRequest;
import com.jumpstart.certification.dto.CertificationResponse;
import com.jumpstart.common.dto.PageResponse;
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

@RestController
@RequestMapping("/api/certifications")
@RequiredArgsConstructor
@Tag(name = "Certifications", description = "Certificates, verification links and expiry tracking")
public class CertificationController {

    private final CertificationService certificationService;

    @PostMapping
    public ResponseEntity<CertificationResponse> create(
            @Valid @RequestBody CertificationRequest request, @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(certificationService.create(request, principal.getId()));
    }

    @GetMapping
    public ResponseEntity<PageResponse<CertificationResponse>> list(
            @PageableDefault(size = 20, sort = "issuedDate") Pageable pageable, @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(certificationService.list(principal.getId(), pageable));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<CertificationResponse> update(
            @PathVariable Long id, @Valid @RequestBody CertificationRequest request, @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(certificationService.update(id, request, principal.getId(), principal.getUser().getRole()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        certificationService.delete(id, principal.getId(), principal.getUser().getRole());
        return ResponseEntity.noContent().build();
    }
}
