package com.jumpstart.security;

import com.jumpstart.user.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Issues and validates short-lived JWT access tokens. Refresh tokens are
 * opaque random strings persisted (hashed) in the database instead of JWTs,
 * so they can be revoked individually - see {@link com.jumpstart.auth.AuthService}.
 */
@Slf4j
@Service
public class JwtService {

    private static final String DEFAULT_SECRET = "CHANGE_ME_IN_PRODUCTION";
    private static final int MIN_SECRET_LENGTH = 32;

    private final SecretKey key;
    private final long accessExpirationMs;
    private final int minSecretLength;

    public JwtService(
            @Value("${jumpstart.security.jwt.secret:CHANGE_ME_IN_PRODUCTION}") String secret,
            @Value("${jumpstart.security.jwt.access-expiration-ms:900000}") long accessExpirationMs,
            @Value("${jumpstart.security.jwt.min-secret-length:32}") int minSecretLength
    ) {
        this.minSecretLength = minSecretLength;
        this.accessExpirationMs = accessExpirationMs;

        // Validate secret at startup
        validateSecret(secret);

        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        log.info("✅ JwtService initialized with access token expiration: {}ms", accessExpirationMs);
    }

    private void validateSecret(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET is not configured");
        }

        if (secret.equals(DEFAULT_SECRET)) {
            throw new IllegalStateException(
                "JWT_SECRET is still set to default value. " +
                "Generate a secure secret with: openssl rand -base64 64"
            );
        }

        if (secret.length() < minSecretLength) {
            throw new IllegalStateException(
                String.format(
                    "JWT_SECRET must be at least %d characters for 256-bit security. " +
                    "Current length: %d characters. " +
                    "Generate a secure secret with: openssl rand -base64 64",
                    minSecretLength,
                    secret.length()
                )
            );
        }

        log.info("✅ JWT_SECRET validated: {} characters", secret.length());
    }

    public String generateAccessToken(Long userId, String email, Role role) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + accessExpirationMs);
        return Jwts.builder()
                .subject(email)
                .claim("uid", userId)
                .claim("role", role.name())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    public long getAccessExpirationMs() {
        return accessExpirationMs;
    }

    public Claims parseClaims(String token) throws JwtException {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    public Long extractUserId(String token) {
        Object raw = parseClaims(token).get("uid");
        if (raw instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(String.valueOf(raw));
    }
}