package com.jumpstart.gamification;

import com.jumpstart.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "user_badges", uniqueConstraints =
    @UniqueConstraint(columnNames = {"user_id", "achievement_code"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserBadge {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "achievement_code", nullable = false, length = 50)
    private String achievementCode;

    @Column(name = "earned_at", nullable = false, updatable = false)
    private Instant earnedAt;

    @PrePersist
    protected void onCreate() {
        earnedAt = Instant.now();
    }
}
