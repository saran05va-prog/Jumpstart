package com.jumpstart.topic.timer;

import com.jumpstart.topic.Topic;
import com.jumpstart.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "topic_timer_state")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TopicTimerState {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "topic_id", nullable = false, unique = true)
    private Topic topic;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String status = "STOPPED";

    @Column(name = "server_start_time")
    private Instant serverStartTime;

    @Column(name = "accumulated_seconds", nullable = false)
    @Builder.Default
    private int accumulatedSeconds = 0;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
