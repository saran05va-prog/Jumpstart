package com.jumpstart.session;

import com.jumpstart.common.audit.Auditable;
import com.jumpstart.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "study_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudySession extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    @Column(nullable = false)
    private double minutes;

    @Column(name = "roadmap_id")
    private Long roadmapId;

    @Column(name = "topic_id")
    private Long topicId;

    @Column(length = 500)
    private String note;
}
