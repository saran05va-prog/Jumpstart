package com.jumpstart.resource;

import com.jumpstart.common.audit.Auditable;
import com.jumpstart.roadmap.Roadmap;
import com.jumpstart.topic.Topic;
import com.jumpstart.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Named ResourceItem (not "Resource") to avoid clashing with
 * org.springframework.core.io.Resource used throughout Spring internals.
 */
@Entity
@Table(name = "resources")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResourceItem extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "roadmap_id")
    private Roadmap roadmap;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id")
    private Topic topic;

    @Column(nullable = false, length = 240)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ResourceType type;

    @Column(length = 1000)
    private String url;

    @ElementCollection
    @CollectionTable(name = "resource_tags", joinColumns = @JoinColumn(name = "resource_id"))
    @Column(name = "tag", length = 60)
    @Builder.Default
    private List<String> tags = new ArrayList<>();

    @Column(nullable = false)
    @Builder.Default
    private double rating = 0;

    @Column(nullable = false)
    @Builder.Default
    private boolean bookmarked = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean completed = false;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "order_index", nullable = false)
    @Builder.Default
    private int orderIndex = 0;

    @Column(length = 30)
    private String duration;

    // ── Unified status & progress (V11) ──

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ResourceStatus status = ResourceStatus.NOT_STARTED;

    @Column(nullable = false)
    @Builder.Default
    private boolean favorite = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean hidden = false;

    @Column(name = "progress_percent", nullable = false)
    @Builder.Default
    private int progressPercent = 0;

    @Column(name = "estimated_minutes")
    private Integer estimatedMinutes;

    @Column(name = "actual_minutes")
    private Integer actualMinutes;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "last_page")
    private Integer lastPage;

    @Column(name = "video_position_seconds")
    private Integer videoPositionSeconds;

    @Column(name = "reading_progress")
    private Double readingProgress;

    /**
     * Keeps the legacy {@code completed} boolean and {@code completedAt}
     * timestamp in sync with the {@link ResourceStatus} enum. Call this
     * from the service layer whenever status changes.
     */
    public void syncLegacyCompleted() {
        this.completed = status.isCompleted();
        if (status.isCompleted()) {
            if (this.completedAt == null) this.completedAt = Instant.now();
            this.progressPercent = 100;
        } else if (status == ResourceStatus.NOT_STARTED) {
            this.completedAt = null;
            this.progressPercent = 0;
        }
    }
}
