package com.jumpstart.roadmap;

import com.jumpstart.common.audit.Auditable;
import com.jumpstart.topic.Topic;
import com.jumpstart.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "roadmaps")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Roadmap extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 60)
    private String tag;

    @Enumerated(EnumType.STRING)
    @Column(name = "color_theme", nullable = false, length = 20)
    @Builder.Default
    private RoadmapColor colorTheme = RoadmapColor.MOSS;

    @Column(nullable = false)
    @Builder.Default
    private boolean archived = false;

    @OneToMany(mappedBy = "roadmap", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<Topic> topics = new ArrayList<>();
}
