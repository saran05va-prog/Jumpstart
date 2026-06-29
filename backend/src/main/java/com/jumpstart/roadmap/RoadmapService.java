package com.jumpstart.roadmap;

import com.jumpstart.common.dto.PageResponse;
import com.jumpstart.common.exception.ForbiddenException;
import com.jumpstart.common.exception.ResourceNotFoundException;
import com.jumpstart.roadmap.dto.RoadmapRequest;
import com.jumpstart.roadmap.dto.RoadmapResponse;
import com.jumpstart.topic.Topic;
import com.jumpstart.user.Role;
import com.jumpstart.user.User;
import com.jumpstart.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RoadmapService {

    private final RoadmapRepository roadmapRepository;
    private final UserRepository userRepository;

    @Transactional
    public RoadmapResponse create(RoadmapRequest request, Long ownerId) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", ownerId));

        Roadmap roadmap = Roadmap.builder()
                .owner(owner)
                .title(request.title())
                .description(request.description())
                .tag(request.tag())
                .colorTheme(request.colorTheme() != null ? RoadmapColor.valueOf(request.colorTheme()) : RoadmapColor.MOSS)
                .archived(false)
                .build();

        return RoadmapResponse.from(roadmapRepository.save(roadmap));
    }

    @Transactional(readOnly = true)
    public PageResponse<RoadmapResponse> list(Long ownerId, String tag, Boolean archived, Pageable pageable) {
        var spec = RoadmapSpecifications.ownedBy(ownerId)
                .and(RoadmapSpecifications.hasTag(tag))
                .and(RoadmapSpecifications.isArchived(archived));

        var page = roadmapRepository.findAll(spec, pageable).map(RoadmapResponse::from);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public RoadmapResponse get(Long id, Long requesterId, Role requesterRole) {
        return RoadmapResponse.from(loadOwned(id, requesterId, requesterRole));
    }

    @Transactional
    public RoadmapResponse update(Long id, RoadmapRequest request, Long requesterId, Role requesterRole) {
        Roadmap roadmap = loadOwned(id, requesterId, requesterRole);
        roadmap.setTitle(request.title());
        roadmap.setDescription(request.description());
        roadmap.setTag(request.tag());
        if (request.colorTheme() != null) {
            roadmap.setColorTheme(RoadmapColor.valueOf(request.colorTheme()));
        }
        return RoadmapResponse.from(roadmapRepository.save(roadmap));
    }

    @Transactional
    public RoadmapResponse setArchived(Long id, boolean archived, Long requesterId, Role requesterRole) {
        Roadmap roadmap = loadOwned(id, requesterId, requesterRole);
        roadmap.setArchived(archived);
        return RoadmapResponse.from(roadmapRepository.save(roadmap));
    }

    @Transactional
    public void delete(Long id, Long requesterId, Role requesterRole) {
        Roadmap roadmap = loadOwned(id, requesterId, requesterRole);
        roadmapRepository.delete(roadmap);
    }

    @Transactional
    public RoadmapResponse clone(Long id, Long requesterId, Role requesterRole) {
        Roadmap source = loadOwned(id, requesterId, requesterRole);

        Roadmap copy = Roadmap.builder()
                .owner(source.getOwner())
                .title(source.getTitle() + " (copy)")
                .description(source.getDescription())
                .tag(source.getTag())
                .colorTheme(source.getColorTheme())
                .archived(false)
                .build();

        List<Topic> clonedTopics = new ArrayList<>();
        for (Topic t : source.getTopics()) {
            clonedTopics.add(Topic.builder()
                    .roadmap(copy)
                    .title(t.getTitle())
                    .status(t.getStatus())
                    .difficulty(t.getDifficulty())
                    .estHours(t.getEstHours())
                    .sortOrder(t.getSortOrder())
                    .build());
        }
        copy.setTopics(clonedTopics);

        return RoadmapResponse.from(roadmapRepository.save(copy));
    }

    private Roadmap loadOwned(Long id, Long requesterId, Role requesterRole) {
        Roadmap roadmap = roadmapRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Roadmap", id));

        if (requesterRole != Role.ADMIN && !roadmap.getOwner().getId().equals(requesterId)) {
            throw new ForbiddenException("You do not have access to this roadmap");
        }
        return roadmap;
    }
}
