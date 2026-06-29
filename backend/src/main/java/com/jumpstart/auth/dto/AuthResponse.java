package com.jumpstart.auth.dto;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        long expiresInMs,
        UserResponse user
) {
}
