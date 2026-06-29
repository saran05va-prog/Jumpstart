package com.jumpstart.activity;

import com.jumpstart.common.audit.Auditable;
import com.jumpstart.user.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "recent_activity")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecentActivity extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(name = "activity_type", nullable = false, length = 40)
    private String activityType;

    @Column(name = "entity_type", length = 40)
    private String entityType;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(length = 500)
    private String subtitle;
}
