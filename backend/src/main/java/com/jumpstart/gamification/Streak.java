package com.jumpstart.gamification;

import com.jumpstart.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "streaks")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Streak {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "current_streak")
    @Builder.Default
    private int currentStreak = 0;

    @Column(name = "longest_streak")
    @Builder.Default
    private int longestStreak = 0;

    @Column(name = "weekly_streak")
    @Builder.Default
    private int weeklyStreak = 0;

    @Column(name = "monthly_streak")
    @Builder.Default
    private int monthlyStreak = 0;

    @Column(name = "perfect_weeks")
    @Builder.Default
    private int perfectWeeks = 0;

    @Column(name = "perfect_months")
    @Builder.Default
    private int perfectMonths = 0;

    @Column(name = "last_activity_date")
    private LocalDate lastActivityDate;

    @Column(name = "week_start_date")
    private LocalDate weekStartDate;

    @Column(name = "month_start_date")
    private LocalDate monthStartDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
