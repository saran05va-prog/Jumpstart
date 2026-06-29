package com.jumpstart.project;

import com.jumpstart.common.exception.ForbiddenException;
import com.jumpstart.common.exception.ResourceNotFoundException;
import com.jumpstart.project.dto.ProjectRequest;
import com.jumpstart.project.dto.ProjectResponse;
import com.jumpstart.roadmap.Roadmap;
import com.jumpstart.roadmap.RoadmapRepository;
import com.jumpstart.topic.Topic;
import com.jumpstart.topic.TopicRepository;
import com.jumpstart.user.Role;
import com.jumpstart.user.User;
import com.jumpstart.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final RoadmapRepository roadmapRepository;
    private final TopicRepository topicRepository;

    @Transactional
    public ProjectResponse create(ProjectRequest request, Long ownerId) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", ownerId));

        Roadmap roadmap = resolveRoadmap(request.roadmapId(), ownerId);
        Topic topic = resolveTopic(request.topicId(), ownerId);

        Project project = Project.builder()
                .owner(owner)
                .roadmap(roadmap)
                .topic(topic)
                .title(request.title())
                .summary(request.summary())
                .githubUrl(request.githubUrl())
                .demoUrl(request.demoUrl())
                .completed(request.completed())
                .build();

        return ProjectResponse.from(projectRepository.save(project));
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> list(Long ownerId, Long roadmapId, Long topicId) {
        if (topicId != null) {
            return projectRepository.findByOwnerIdAndTopicIdOrderByCreatedAtDesc(ownerId, topicId)
                    .stream().map(ProjectResponse::from).toList();
        }
        if (roadmapId != null) {
            return projectRepository.findByOwnerIdAndRoadmapIdOrderByCreatedAtDesc(ownerId, roadmapId)
                    .stream().map(ProjectResponse::from).toList();
        }
        return projectRepository.findByOwnerIdOrderByCreatedAtDesc(ownerId)
                .stream().map(ProjectResponse::from).toList();
    }

    @Transactional
    public ProjectResponse update(Long id, ProjectRequest request, Long requesterId, Role requesterRole) {
        Project project = loadOwned(id, requesterId, requesterRole);
        project.setTitle(request.title());
        project.setSummary(request.summary());
        project.setGithubUrl(request.githubUrl());
        project.setDemoUrl(request.demoUrl());
        project.setCompleted(request.completed());
        if (request.roadmapId() != null) {
            project.setRoadmap(resolveRoadmap(request.roadmapId(), requesterId));
        }
        if (request.topicId() != null) {
            project.setTopic(resolveTopic(request.topicId(), requesterId));
        }
        return ProjectResponse.from(projectRepository.save(project));
    }

    @Transactional
    public ProjectResponse toggleCompleted(Long id, Long requesterId, Role requesterRole) {
        Project project = loadOwned(id, requesterId, requesterRole);
        project.setCompleted(!project.isCompleted());
        return ProjectResponse.from(projectRepository.save(project));
    }

    @Transactional
    public void delete(Long id, Long requesterId, Role requesterRole) {
        projectRepository.delete(loadOwned(id, requesterId, requesterRole));
    }

    private Project loadOwned(Long id, Long requesterId, Role requesterRole) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project", id));
        if (requesterRole != Role.ADMIN && !project.getOwner().getId().equals(requesterId)) {
            throw new ForbiddenException("You do not have access to this project");
        }
        return project;
    }

    private Roadmap resolveRoadmap(Long roadmapId, Long ownerId) {
        if (roadmapId == null) return null;
        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new ResourceNotFoundException("Roadmap", roadmapId));
        if (!roadmap.getOwner().getId().equals(ownerId)) {
            throw new ForbiddenException("You do not have access to this roadmap");
        }
        return roadmap;
    }

    private Topic resolveTopic(Long topicId, Long ownerId) {
        if (topicId == null) return null;
        Topic topic = topicRepository.findByIdWithRoadmapAndOwner(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic", topicId));
        if (!topic.getRoadmap().getOwner().getId().equals(ownerId)) {
            throw new ForbiddenException("You do not have access to this topic");
        }
        return topic;
    }
}
