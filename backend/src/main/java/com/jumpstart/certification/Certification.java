package com.jumpstart.certification;

import com.jumpstart.common.audit.Auditable;
import com.jumpstart.roadmap.Roadmap;
import com.jumpstart.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "certifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Certification extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "roadmap_id")
    private Roadmap roadmap;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 160)
    private String issuer;

    @Column(name = "issued_date")
    private LocalDate issuedDate;

    @Column(name = "expires_date")
    private LocalDate expiresDate;

    @Column(name = "verification_url", length = 1000)
    private String verificationUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private CertificationStatus status = CertificationStatus.PLANNED;

    @Column(name = "completion_date")
    private LocalDate completionDate;

    @Column(name = "study_hours", nullable = false)
    @Builder.Default
    private int studyHours = 0;

    @Column(name = "cert_notes", columnDefinition = "TEXT")
    private String notes;

    @Transient
    public CertificationStatus getExpiryStatus() {
        if (expiresDate == null) return CertificationStatus.ACTIVE;
        LocalDate now = LocalDate.now();
        if (expiresDate.isBefore(now)) return CertificationStatus.EXPIRED;
        if (expiresDate.isBefore(now.plusDays(90))) return CertificationStatus.EXPIRING;
        return CertificationStatus.ACTIVE;
    }
}
