package com.jumpstart.activity;

import com.jumpstart.activity.dto.RecentActivityResponse;
import com.jumpstart.user.User;
import com.jumpstart.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Centralised recent-activity feed.
 *
 * <p>Uses {@link Propagation#REQUIRES_NEW} so that an activity record is
 * persisted even if the calling transaction rolls back — the audit trail
 * should survive. Failures are swallowed (logged) so they never break the
 * primary operation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RecentActivityService {

    private final RecentActivityRepository repository;
    private final UserRepository userRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(Long ownerId, String activityType, String entityType,
                       Long entityId, String title, String subtitle) {
        try {
            User owner = userRepository.findById(ownerId).orElse(null);
            if (owner == null) return;
            RecentActivity activity = RecentActivity.builder()
                    .owner(owner)
                    .activityType(activityType)
                    .entityType(entityType)
                    .entityId(entityId)
                    .title(title != null && title.length() > 300 ? title.substring(0, 297) + "..." : title)
                    .subtitle(subtitle != null && subtitle.length() > 500 ? subtitle.substring(0, 497) + "..." : subtitle)
                    .build();
            repository.save(activity);
        } catch (Exception e) {
            log.warn("Failed to record activity [{}]: {}", activityType, e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<RecentActivityResponse> list(Long ownerId, int limit) {
        return repository.findByOwnerIdOrderByCreatedAtDesc(ownerId)
                .stream()
                .limit(limit)
                .map(RecentActivityResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RecentActivityResponse> listSince(Long ownerId, Instant after) {
        return repository.findByOwnerIdAndCreatedAtAfterOrderByCreatedAtDesc(ownerId, after)
                .stream()
                .map(RecentActivityResponse::from)
                .toList();
    }
}
