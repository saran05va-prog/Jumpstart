package com.jumpstart.gamification.dto;

import com.jumpstart.gamification.XpTransaction;

import java.time.Instant;

public record XpTransactionResponse(
        Long id,
        int amount,
        String reason,
        String referenceType,
        Long referenceId,
        Instant createdAt
) {
    public static XpTransactionResponse from(XpTransaction tx) {
        return new XpTransactionResponse(
                tx.getId(), tx.getAmount(), tx.getReason(),
                tx.getReferenceType(), tx.getReferenceId(),
                tx.getCreatedAt()
        );
    }
}
