package com.jumpstart.goal;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "goal_checklist_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GoalChecklistItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "goal_id", nullable = false)
    private Goal goal;

    @Column(length = 500)
    private String text;

    @Column(nullable = false)
    @Builder.Default
    private boolean done = false;

    @Column(name = "order_index", nullable = false)
    @Builder.Default
    private int orderIndex = 0;
}
