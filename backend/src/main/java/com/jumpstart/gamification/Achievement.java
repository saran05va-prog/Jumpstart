package com.jumpstart.gamification;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "achievements")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Achievement {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 50)
    private String icon;

    @Column(length = 30)
    private String category;

    @Column(name = "xp_reward")
    @Builder.Default
    private int xpReward = 0;

    @Column(name = "criteria_json", columnDefinition = "TEXT")
    private String criteriaJson;
}
