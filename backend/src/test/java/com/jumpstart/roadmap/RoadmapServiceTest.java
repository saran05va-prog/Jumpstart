package com.jumpstart.roadmap;

import com.jumpstart.common.exception.ForbiddenException;
import com.jumpstart.common.exception.ResourceNotFoundException;
import com.jumpstart.roadmap.dto.RoadmapRequest;
import com.jumpstart.user.Role;
import com.jumpstart.user.User;
import com.jumpstart.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoadmapServiceTest {

    @Mock
    private RoadmapRepository roadmapRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RoadmapService roadmapService;

    private User owner;
    private User otherUser;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(1L).name("Owner").email("owner@example.com").role(Role.STUDENT).build();
        otherUser = User.builder().id(2L).name("Other").email("other@example.com").role(Role.STUDENT).build();
    }

    @Test
    void createPersistsARoadmapOwnedByTheRequestingUser() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(owner));
        when(roadmapRepository.save(any(Roadmap.class))).thenAnswer(invocation -> {
            Roadmap r = invocation.getArgument(0);
            r.setId(10L);
            return r;
        });

        var response = roadmapService.create(new RoadmapRequest("Backend Systems", "desc", "Engineering", "MOSS"), 1L);

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.title()).isEqualTo("Backend Systems");
        assertThat(response.progressPercent()).isZero();
    }

    @Test
    void getThrowsNotFoundWhenRoadmapDoesNotExist() {
        when(roadmapRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> roadmapService.get(99L, 1L, Role.STUDENT))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getThrowsForbiddenWhenAnotherStudentTriesToAccessIt() {
        Roadmap roadmap = Roadmap.builder().id(10L).owner(owner).title("Backend").build();
        when(roadmapRepository.findById(10L)).thenReturn(Optional.of(roadmap));

        assertThatThrownBy(() -> roadmapService.get(10L, otherUser.getId(), Role.STUDENT))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void adminCanAccessAnyUsersRoadmap() {
        Roadmap roadmap = Roadmap.builder().id(10L).owner(owner).title("Backend").build();
        when(roadmapRepository.findById(10L)).thenReturn(Optional.of(roadmap));

        var response = roadmapService.get(10L, otherUser.getId(), Role.ADMIN);

        assertThat(response.title()).isEqualTo("Backend");
    }
}
