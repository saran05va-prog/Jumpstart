package com.jumpstart.topic;

import com.jumpstart.common.audit.Auditable;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Entity
@Table(name = "topic_links")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TopicLink extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "topic_id", nullable = false)
    private Topic topic;

    @NotBlank
    @Size(max = 200)
    @Column(nullable = false, length = 200)
    private String label;

    @NotBlank
    @Size(max = 1000)
    @Column(nullable = false, length = 1000)
    private String uri;
}
