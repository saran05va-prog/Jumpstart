package com.jumpstart.search;

import com.jumpstart.certification.CertificationRepository;
import com.jumpstart.note.NoteRepository;
import com.jumpstart.project.ProjectRepository;
import com.jumpstart.resource.ResourceRepository;
import com.jumpstart.resource.ResourceSpecifications;
import com.jumpstart.roadmap.RoadmapRepository;
import com.jumpstart.roadmap.RoadmapSpecifications;
import com.jumpstart.search.dto.SearchResult;
import com.jumpstart.security.SecurityUser;
import com.jumpstart.topic.TopicRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Search", description = "Global search across all user content")
public class SearchController {

    private static final int LIMIT_PER_TYPE = 8;

    private final RoadmapRepository roadmapRepository;
    private final NoteRepository noteRepository;
    private final ResourceRepository resourceRepository;
    private final TopicRepository topicRepository;
    private final ProjectRepository projectRepository;
    private final CertificationRepository certificationRepository;

    @GetMapping("/api/search")
    @Operation(summary = "Search the current user's roadmaps, topics, notes, resources, projects and certifications")
    public List<SearchResult> search(@RequestParam String q, @AuthenticationPrincipal SecurityUser principal) {
        List<SearchResult> results = new ArrayList<>();
        var page = PageRequest.of(0, LIMIT_PER_TYPE);

        var roadmapSpec = RoadmapSpecifications.ownedBy(principal.getId()).and(RoadmapSpecifications.titleContains(q));
        roadmapRepository.findAll(roadmapSpec, page).forEach(r ->
                results.add(new SearchResult("ROADMAP", r.getId(), r.getTitle(), r.getTag())));

        topicRepository.searchByOwnerAndTitle(principal.getId(), q).stream().limit(LIMIT_PER_TYPE).forEach(t ->
                results.add(new SearchResult("TOPIC", t.getId(), t.getTitle(), "Topic")));

        noteRepository.searchByOwner(principal.getId(), q).stream().limit(LIMIT_PER_TYPE).forEach(n ->
                results.add(new SearchResult("NOTE", n.getId(), n.getTitle(), n.getTags() != null && !n.getTags().isEmpty() ? "#" + String.join(" #", n.getTags()) : "Note")));

        var resourceSpec = ResourceSpecifications.ownedBy(principal.getId()).and(ResourceSpecifications.titleContains(q));
        resourceRepository.findAll(resourceSpec, page).forEach(r ->
                results.add(new SearchResult("RESOURCE", r.getId(), r.getTitle(), r.getType().name())));

        projectRepository.findByOwnerIdOrderByCreatedAtDesc(principal.getId()).stream()
                .filter(p -> p.getTitle().toLowerCase().contains(q.toLowerCase()))
                .limit(LIMIT_PER_TYPE)
                .forEach(p ->
                        results.add(new SearchResult("PROJECT", p.getId(), p.getTitle(), p.isCompleted() ? "Completed" : "In progress")));

        certificationRepository.findByOwnerId(principal.getId()).stream()
                .filter(c -> c.getTitle().toLowerCase().contains(q.toLowerCase()))
                .limit(LIMIT_PER_TYPE)
                .forEach(c ->
                        results.add(new SearchResult("CERTIFICATION", c.getId(), c.getTitle(), c.getStatus().name())));

        return results;
    }
}
