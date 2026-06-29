package com.jumpstart.certification;

import com.jumpstart.certification.dto.CertificationRequest;
import com.jumpstart.certification.dto.CertificationResponse;
import com.jumpstart.common.dto.PageResponse;
import com.jumpstart.common.exception.ForbiddenException;
import com.jumpstart.common.exception.ResourceNotFoundException;
import com.jumpstart.roadmap.Roadmap;
import com.jumpstart.roadmap.RoadmapRepository;
import com.jumpstart.user.Role;
import com.jumpstart.user.User;
import com.jumpstart.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CertificationService {

    private final CertificationRepository certificationRepository;
    private final UserRepository userRepository;
    private final RoadmapRepository roadmapRepository;

    @Transactional
    public CertificationResponse create(CertificationRequest request, Long ownerId) {
        User owner = userRepository.findById(ownerId).orElseThrow(() -> new ResourceNotFoundException("User", ownerId));
        Roadmap roadmap = request.roadmapId() != null
                ? roadmapRepository.findById(request.roadmapId()).orElseThrow(() -> new ResourceNotFoundException("Roadmap", request.roadmapId()))
                : null;

        Certification cert = Certification.builder()
                .owner(owner)
                .roadmap(roadmap)
                .title(request.title())
                .issuer(request.issuer())
                .issuedDate(request.issuedDate())
                .expiresDate(request.expiresDate())
                .verificationUrl(request.verificationUrl())
                .status(request.status() != null ? CertificationStatus.valueOf(request.status()) : CertificationStatus.PLANNED)
                .completionDate(request.completionDate())
                .studyHours(request.studyHours() != null ? request.studyHours() : 0)
                .notes(request.notes())
                .build();

        return CertificationResponse.from(certificationRepository.save(cert));
    }

    public PageResponse<CertificationResponse> list(Long ownerId, Pageable pageable) {
        return PageResponse.from(certificationRepository.findByOwnerId(ownerId, pageable).map(CertificationResponse::from));
    }

    @Transactional
    public CertificationResponse update(Long id, CertificationRequest request, Long requesterId, Role requesterRole) {
        Certification cert = loadOwned(id, requesterId, requesterRole);
        cert.setTitle(request.title());
        cert.setIssuer(request.issuer());
        cert.setIssuedDate(request.issuedDate());
        cert.setExpiresDate(request.expiresDate());
        cert.setVerificationUrl(request.verificationUrl());
        if (request.status() != null) {
            cert.setStatus(CertificationStatus.valueOf(request.status()));
        }
        cert.setCompletionDate(request.completionDate());
        if (request.studyHours() != null) cert.setStudyHours(request.studyHours());
        if (request.notes() != null) cert.setNotes(request.notes());
        if (request.roadmapId() != null) {
            Roadmap roadmap = roadmapRepository.findById(request.roadmapId())
                    .orElseThrow(() -> new ResourceNotFoundException("Roadmap", request.roadmapId()));
            cert.setRoadmap(roadmap);
        }
        return CertificationResponse.from(certificationRepository.save(cert));
    }

    @Transactional
    public void delete(Long id, Long requesterId, Role requesterRole) {
        certificationRepository.delete(loadOwned(id, requesterId, requesterRole));
    }

    private Certification loadOwned(Long id, Long requesterId, Role requesterRole) {
        Certification cert = certificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Certification", id));
        if (requesterRole != Role.ADMIN && !cert.getOwner().getId().equals(requesterId)) {
            throw new ForbiddenException("You do not have access to this certification");
        }
        return cert;
    }
}
