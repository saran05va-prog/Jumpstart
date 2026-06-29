package com.jumpstart.certification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CertificationRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 160) String issuer,
        LocalDate issuedDate,
        LocalDate expiresDate,
        @Size(max = 1000) String verificationUrl,
        @Pattern(regexp = "PLANNED|IN_PROGRESS|COMPLETED",
                message = "Status must be PLANNED, IN_PROGRESS, or COMPLETED") String status,
        LocalDate completionDate,
        Long roadmapId,
        Integer studyHours,
        String notes
) {
}
