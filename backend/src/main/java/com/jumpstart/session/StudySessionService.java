package com.jumpstart.session;

import com.jumpstart.common.exception.ForbiddenException;
import com.jumpstart.common.exception.ResourceNotFoundException;
import com.jumpstart.session.dto.StudySessionRequest;
import com.jumpstart.session.dto.StudySessionResponse;
import com.jumpstart.user.Role;
import com.jumpstart.user.User;
import com.jumpstart.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StudySessionService {

    private final StudySessionRepository sessionRepository;
    private final UserRepository userRepository;

    @Transactional
    public StudySessionResponse create(StudySessionRequest request, Long ownerId) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", ownerId));

        StudySession session = StudySession.builder()
                .owner(owner)
                .sessionDate(request.sessionDate())
                .minutes(request.minutes())
                .roadmapId(request.roadmapId())
                .topicId(request.topicId())
                .note(request.note())
                .build();

        return StudySessionResponse.from(sessionRepository.save(session));
    }

    @Transactional
    public StudySessionResponse update(Long id, StudySessionRequest request, Long requesterId, Role requesterRole) {
        StudySession session = loadOwned(id, requesterId, requesterRole);
        session.setSessionDate(request.sessionDate());
        session.setMinutes(request.minutes());
        session.setRoadmapId(request.roadmapId());
        session.setTopicId(request.topicId());
        session.setNote(request.note());
        return StudySessionResponse.from(sessionRepository.save(session));
    }

    @Transactional(readOnly = true)
    public List<StudySessionResponse> list(Long ownerId, LocalDate from, LocalDate to) {
        List<StudySession> sessions;
        if (from != null && to != null) {
            sessions = sessionRepository.findByOwnerIdAndSessionDateBetweenOrderBySessionDateAsc(ownerId, from, to);
        } else {
            sessions = sessionRepository.findByOwnerIdOrderBySessionDateDesc(ownerId);
        }
        return sessions.stream().map(StudySessionResponse::from).toList();
    }

    @Transactional
    public void delete(Long id, Long requesterId, Role requesterRole) {
        sessionRepository.delete(loadOwned(id, requesterId, requesterRole));
    }

    private StudySession loadOwned(Long id, Long requesterId, Role requesterRole) {
        StudySession session = sessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("StudySession", id));
        if (requesterRole != Role.ADMIN && !session.getOwner().getId().equals(requesterId)) {
            throw new ForbiddenException("You do not have access to this study session");
        }
        return session;
    }
}
