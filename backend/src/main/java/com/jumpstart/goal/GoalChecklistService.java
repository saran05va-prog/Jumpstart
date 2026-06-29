package com.jumpstart.goal;

import com.jumpstart.common.exception.ForbiddenException;
import com.jumpstart.common.exception.ResourceNotFoundException;
import com.jumpstart.goal.dto.GoalChecklistItemRequest;
import com.jumpstart.goal.dto.GoalChecklistItemResponse;
import com.jumpstart.user.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GoalChecklistService {

    private final GoalChecklistRepository checklistRepository;
    private final GoalRepository goalRepository;

    public List<GoalChecklistItemResponse> list(Long goalId, Long requesterId, Role role) {
        loadOwnedGoal(goalId, requesterId, role);
        return checklistRepository.findByGoalIdOrderByOrderIndexAsc(goalId)
                .stream().map(GoalChecklistItemResponse::from).toList();
    }

    @Transactional
    public GoalChecklistItemResponse create(Long goalId, GoalChecklistItemRequest request, Long requesterId, Role role) {
        Goal goal = loadOwnedGoal(goalId, requesterId, role);
        var items = checklistRepository.findByGoalIdOrderByOrderIndexAsc(goalId);
        int nextOrder = items.isEmpty() ? 0 : items.getLast().getOrderIndex() + 1;
        GoalChecklistItem item = GoalChecklistItem.builder()
                .goal(goal)
                .text(request.text())
                .done(request.done() != null && request.done())
                .orderIndex(request.orderIndex() != null ? request.orderIndex() : nextOrder)
                .build();
        return GoalChecklistItemResponse.from(checklistRepository.save(item));
    }

    @Transactional
    public GoalChecklistItemResponse update(Long itemId, GoalChecklistItemRequest request, Long requesterId, Role role) {
        GoalChecklistItem item = checklistRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("ChecklistItem", itemId));
        loadOwnedGoal(item.getGoal().getId(), requesterId, role);
        if (request.text() != null) item.setText(request.text());
        if (request.done() != null) item.setDone(request.done());
        if (request.orderIndex() != null) item.setOrderIndex(request.orderIndex());
        return GoalChecklistItemResponse.from(checklistRepository.save(item));
    }

    @Transactional
    public void delete(Long itemId, Long requesterId, Role role) {
        GoalChecklistItem item = checklistRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("ChecklistItem", itemId));
        loadOwnedGoal(item.getGoal().getId(), requesterId, role);
        checklistRepository.delete(item);
    }

    private Goal loadOwnedGoal(Long goalId, Long requesterId, Role role) {
        Goal goal = goalRepository.findById(goalId)
                .orElseThrow(() -> new ResourceNotFoundException("Goal", goalId));
        if (role != Role.ADMIN && !goal.getOwner().getId().equals(requesterId)) {
            throw new ForbiddenException("You do not have access to this goal");
        }
        return goal;
    }
}
