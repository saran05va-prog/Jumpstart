package com.jumpstart.topic.prerequisite;

import com.jumpstart.topic.Topic;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "topic_prerequisites", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"topic_id", "prerequisite_topic_id"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TopicPrerequisite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "topic_id", nullable = false)
    private Topic topic;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "prerequisite_topic_id", nullable = false)
    private Topic prerequisiteTopic;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }
}
