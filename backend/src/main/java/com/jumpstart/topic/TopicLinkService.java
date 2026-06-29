package com.jumpstart.topic;

import com.jumpstart.common.exception.ForbiddenException;
import com.jumpstart.common.exception.ResourceNotFoundException;
import com.jumpstart.topic.dto.TopicLinkRequest;
import com.jumpstart.topic.dto.TopicLinkResponse;
import com.jumpstart.user.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TopicLinkService {

    private final TopicLinkRepository linkRepository;
    private final TopicRepository topicRepository;

    @Transactional(readOnly = true)
    public List<TopicLinkResponse> listByTopic(Long topicId, Long requesterId, Role requesterRole) {
        Topic topic = loadOwnedTopic(topicId, requesterId, requesterRole);
        return linkRepository.findByTopicIdOrderByCreatedAtDesc(topic.getId())
                .stream().map(TopicLinkResponse::from).toList();
    }

    @Transactional
    public TopicLinkResponse create(Long topicId, TopicLinkRequest request, Long requesterId, Role requesterRole) {
        Topic topic = loadOwnedTopic(topicId, requesterId, requesterRole);

        TopicLink link = TopicLink.builder()
                .topic(topic)
                .label(request.label())
                .uri(request.uri())
                .build();

        return TopicLinkResponse.from(linkRepository.save(link));
    }

    @Transactional
    public TopicLinkResponse update(Long linkId, TopicLinkRequest request, Long requesterId, Role requesterRole) {
        TopicLink link = linkRepository.findById(linkId)
                .orElseThrow(() -> new ResourceNotFoundException("TopicLink", linkId));
        assertOwnership(link.getTopic(), requesterId, requesterRole);

        link.setLabel(request.label());
        link.setUri(request.uri());

        return TopicLinkResponse.from(linkRepository.save(link));
    }

    @Transactional
    public void delete(Long linkId, Long requesterId, Role requesterRole) {
        TopicLink link = linkRepository.findById(linkId)
                .orElseThrow(() -> new ResourceNotFoundException("TopicLink", linkId));
        assertOwnership(link.getTopic(), requesterId, requesterRole);
        linkRepository.delete(link);
    }

    private Topic loadOwnedTopic(Long topicId, Long requesterId, Role requesterRole) {
        Topic topic = topicRepository.findByIdWithRoadmapAndOwner(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic", topicId));
        assertOwnership(topic, requesterId, requesterRole);
        return topic;
    }

    private void assertOwnership(Topic topic, Long requesterId, Role requesterRole) {
        if (requesterRole != Role.ADMIN && !topic.getRoadmap().getOwner().getId().equals(requesterId)) {
            throw new ForbiddenException("You do not have access to this topic");
        }
    }
}
