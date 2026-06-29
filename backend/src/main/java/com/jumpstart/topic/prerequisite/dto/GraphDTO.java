package com.jumpstart.topic.prerequisite.dto;

import java.util.List;

public record GraphDTO(
        List<GraphNodeDTO> nodes,
        List<GraphEdgeDTO> edges
) {}
