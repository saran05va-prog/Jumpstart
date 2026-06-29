package com.jumpstart.security;

import com.jumpstart.user.Role;
import io.jsonwebtoken.ExpiredJwtException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private final JwtService jwtService = new JwtService(
            "unit-test-secret-key-that-is-long-enough-for-hmac-sha256-signing",
            1000 * 60 * 15,
            32
    );

    @Test
    void generatesATokenThatCarriesTheExpectedClaims() {
        String token = jwtService.generateAccessToken(42L, "asha@example.com", Role.STUDENT);

        assertThat(jwtService.isValid(token)).isTrue();
        assertThat(jwtService.extractEmail(token)).isEqualTo("asha@example.com");
        assertThat(jwtService.extractUserId(token)).isEqualTo(42L);
    }

    @Test
    void rejectsATokenThatHasExpired() {
        JwtService shortLived = new JwtService(
                "unit-test-secret-key-that-is-long-enough-for-hmac-sha256-signing",
                -1000,
                32
        );
        String token = shortLived.generateAccessToken(1L, "expired@example.com", Role.STUDENT);

        assertThat(shortLived.isValid(token)).isFalse();
        assertThatThrownBy(() -> shortLived.parseClaims(token)).isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    void rejectsATamperedToken() {
        String token = jwtService.generateAccessToken(1L, "user@example.com", Role.STUDENT);
        String tampered = token.substring(0, token.length() - 2) + "xx";

        assertThat(jwtService.isValid(tampered)).isFalse();
    }
}