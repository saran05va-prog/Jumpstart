package com.jumpstart.certification.dto;

import com.jumpstart.certification.Certification;

import java.time.LocalDate;

public record CertificationResponse(
        Long id,
        String title,
        String issuer,
        LocalDate issuedDate,
        LocalDate expiresDate,
        String verificationUrl,
        String status,
        String expiryStatus,
        LocalDate completionDate,
        Long roadmapId,
        int studyHours,
        String notes
) {
    public static CertificationResponse from(Certification c) {
        return new CertificationResponse(
                c.getId(), c.getTitle(), c.getIssuer(), c.getIssuedDate(),
                c.getExpiresDate(), c.getVerificationUrl(),
                c.getStatus().name(),
                c.getExpiryStatus().name(),
                c.getCompletionDate(),
                c.getRoadmap() != null ? c.getRoadmap().getId() : null,
                c.getStudyHours(),
                c.getNotes()
        );
    }
}
