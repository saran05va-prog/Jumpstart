package com.jumpstart.topic;

import com.jumpstart.common.audit.Auditable;
import com.jumpstart.roadmap.Roadmap;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "topics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Topic extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "roadmap_id", nullable = false)
    private Roadmap roadmap;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TopicStatus status = TopicStatus.NOT_STARTED;

    @Min(1) @Max(3)
    @Column(nullable = false)
    @Builder.Default
    private int difficulty = 1;

    @Column(name = "est_hours", nullable = false)
    @Builder.Default
    private double estHours = 1.0;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    @Column(name = "parent_id")
    private Long parentId;

    @Column(name = "source_ref", length = 120)
    private String sourceRef;

    @Column(name = "milestone_label", length = 60)
    private String milestoneLabel;

    @OneToMany(mappedBy = "topic", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<ChecklistItem> checklist = new ArrayList<>();

    @OneToMany(mappedBy = "topic", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt DESC")
    @Builder.Default
    private List<TopicLink> links = new ArrayList<>();
}
