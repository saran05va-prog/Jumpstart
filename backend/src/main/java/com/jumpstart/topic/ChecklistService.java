package com.jumpstart.topic;

import com.jumpstart.topic.dto.ChecklistItemRequest;
import com.jumpstart.topic.dto.ChecklistItemResponse;
import com.jumpstart.common.exception.ForbiddenException;
import com.jumpstart.common.exception.ResourceNotFoundException;
import com.jumpstart.user.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChecklistService {

    private final ChecklistItemRepository checklistRepository;
    private final TopicRepository topicRepository;

    @Transactional(readOnly = true)
    public List<ChecklistItemResponse> listByTopic(Long topicId, Long requesterId, Role requesterRole) {
        Topic topic = loadOwnedTopic(topicId, requesterId, requesterRole);
        return checklistRepository.findByTopicIdOrderBySortOrderAsc(topic.getId())
                .stream().map(ChecklistItemResponse::from).toList();
    }

    @Transactional
    public ChecklistItemResponse create(Long topicId, ChecklistItemRequest request, Long requesterId, Role requesterRole) {
        Topic topic = loadOwnedTopic(topicId, requesterId, requesterRole);

        ChecklistItem item = ChecklistItem.builder()
                .topic(topic)
                .label(request.label())
                .completed(request.completed())
                .sortOrder(request.sortOrder())
                .build();

        return ChecklistItemResponse.from(checklistRepository.save(item));
    }

    @Transactional
    public ChecklistItemResponse update(Long itemId, ChecklistItemRequest request, Long requesterId, Role requesterRole) {
        ChecklistItem item = checklistRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("ChecklistItem", itemId));
        assertOwnership(item.getTopic(), requesterId, requesterRole);

        item.setLabel(request.label());
        item.setCompleted(request.completed());
        item.setSortOrder(request.sortOrder());

        return ChecklistItemResponse.from(checklistRepository.save(item));
    }

    @Transactional
    public ChecklistItemResponse toggleCompleted(Long itemId, Long requesterId, Role requesterRole) {
        ChecklistItem item = checklistRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("ChecklistItem", itemId));
        assertOwnership(item.getTopic(), requesterId, requesterRole);

        item.setCompleted(!item.isCompleted());
        return ChecklistItemResponse.from(checklistRepository.save(item));
    }

    @Transactional
    public void delete(Long itemId, Long requesterId, Role requesterRole) {
        ChecklistItem item = checklistRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("ChecklistItem", itemId));
        assertOwnership(item.getTopic(), requesterId, requesterRole);
        checklistRepository.delete(item);
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
