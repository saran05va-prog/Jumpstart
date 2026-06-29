package com.jumpstart.topic;

import com.jumpstart.roadmap.Roadmap;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "topic_edges")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TopicEdge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "roadmap_id", nullable = false)
    private Roadmap roadmap;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "from_topic_id", nullable = false)
    private Topic fromTopic;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "to_topic_id", nullable = false)
    private Topic toTopic;

    @Enumerated(EnumType.STRING)
    @Column(name = "edge_type", nullable = false, length = 20)
    private EdgeType edgeType;
}
