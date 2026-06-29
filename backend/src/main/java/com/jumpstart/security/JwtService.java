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
 *
 * IMPORTANT: This service is designed to NEVER fail during construction.
 * If JWT_SECRET is missing or invalid, it will log a warning but start anyway.
 * The StartupValidationRunner will handle security validation after startup.
 */
@Slf4j
@Service
public class JwtService {

    private final SecretKey key;
    private final long accessExpirationMs;
    private final boolean isValid;

    public JwtService(
            @Value("${jumpstart.security.jwt.secret:DEFAULT_SECRET_FOR_DEV}") String secret,
            @Value("${jumpstart.security.jwt.access-expiration-ms:900000}") long accessExpirationMs
    ) {
        this.accessExpirationMs = accessExpirationMs;

        // NEVER throw during construction - always start successfully
        // Validate and log warnings instead
        if (secret == null || secret.isBlank() || secret.equals("DEFAULT_SECRET_FOR_DEV")) {
            log.warn("JWT_SECRET is not configured or using default - JWT authentication will NOT be secure!");
            log.warn("  For development only. Set JWT_SECRET environment variable for production.");
            this.key = Keys.hmacShaKeyFor("TEMPORARY_DEV_KEY_FOR_STARTUP_ONLY".getBytes(StandardCharsets.UTF_8));
            this.isValid = false;
            return;
        }

        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            log.warn("JWT_SECRET is too short ({} bytes) - minimum 32 bytes required. JWT authentication disabled.", keyBytes.length);
            log.warn("  Use a secret at least 32 characters long for production.");
            this.key = Keys.hmacShaKeyFor("TEMPORARY_DEV_KEY_FOR_STARTUP_ONLY".getBytes(StandardCharsets.UTF_8));
            this.isValid = false;
        } else {
            this.key = Keys.hmacShaKeyFor(keyBytes);
            this.isValid = true;
            log.info("JwtService initialized - access token expiration: {}ms", accessExpirationMs);
        }
    }

    public String generateAccessToken(Long userId, String email, Role role) {
        if (!isValid) {
            log.error("JWT_SECRET not configured - cannot generate tokens!");
            throw new IllegalStateException("JWT_SECRET not configured - cannot generate access tokens");
        }
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

    public boolean isConfigured() {
        return isValid;
    }

    public Claims parseClaims(String token) throws JwtException {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isValid(String token) {
        if (!isValid) {
            return false;
        }
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