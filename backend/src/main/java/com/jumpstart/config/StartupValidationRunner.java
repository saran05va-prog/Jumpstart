package com.jumpstart.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.List;

/**
 * Validates critical startup configuration before the application fully starts.
 * Fails fast with clear error messages instead of cryptic runtime failures.
 */
@Slf4j
@Component
@Order(Integer.MIN_VALUE)
@RequiredArgsConstructor
public class StartupValidationRunner implements ApplicationRunner {

    private final DataSource dataSource;

    @Value("${spring.profiles.active:unknown}")
    private String activeProfile;

    @Value("${jumpstart.security.jwt.secret:}")
    private String jwtSecret;

    @Value("${jumpstart.cors.allowed-origins:}")
    private String corsAllowedOrigins;

    @Value("${DB_HOST:}")
    private String dbHost;

    @Value("${DB_NAME:}")
    private String dbName;

    @Value("${DB_USERNAME:}")
    private String dbUsername;

    @Value("${DB_PASSWORD:}")
    private String dbPassword;

    @Value("${DB_PORT:}")
    private String dbPort;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        List<String> errors = new ArrayList<>();

        log.info("=".repeat(60));
        log.info("STARTUP VALIDATION - Profile: {}", activeProfile);
        log.info("=".repeat(60));

        // Check if running in production
        boolean isProduction = "prod".equalsIgnoreCase(activeProfile);

        if (isProduction) {
            log.info("Running in PRODUCTION mode - performing strict validation");

            // Validate database configuration for production
            validateDatabaseConfig(errors);

            // Validate JWT configuration for production
            validateJwtConfig(errors, isProduction);

            // Validate CORS configuration for production
            validateCorsConfig(errors);
        } else {
            log.info("Running in {} mode - using lenient validation", activeProfile);

            // Lenient validation for non-production
            validateDatabaseConfig(errors);
            validateJwtConfig(errors, false);
            validateCorsConfig(errors);
        }

        // Log validation results
        if (!errors.isEmpty()) {
            log.error("-".repeat(60));
            log.error("STARTUP VALIDATION FAILED");
            log.error("-".repeat(60));
            errors.forEach(error -> log.error("  ❌ {}", error));
            log.error("-".repeat(60));

            // In production, fail hard; in dev, warn but continue
            if (isProduction) {
                throw new IllegalStateException(
                    "Startup validation failed. Fix the following issues before deployment:\n" +
                    String.join("\n", errors)
                );
            } else {
                log.warn("⚠️  Startup validation warnings - continuing anyway in development mode");
            }
        } else {
            log.info("-".repeat(60));
            log.info("✅ STARTUP VALIDATION PASSED");
            log.info("-".repeat(60));
        }
    }

    private void validateDatabaseConfig(List<String> errors) {
        log.info("Validating database configuration...");

        if (dbHost.isBlank() || "localhost".equals(dbHost)) {
            if ("prod".equals(activeProfile)) {
                errors.add("DB_HOST is not set or is localhost in production");
            }
            log.warn("  ⚠️  DB_HOST: {} (defaulting to localhost for dev)", dbHost.isBlank() ? "not set" : dbHost);
        } else {
            log.info("  ✅ DB_HOST: {}", maskHost(dbHost));
        }

        if (dbName.isBlank()) {
            errors.add("DB_NAME is not set");
        } else {
            log.info("  ✅ DB_NAME: {}", dbName);
        }

        if (dbUsername.isBlank()) {
            errors.add("DB_USERNAME is not set");
        } else {
            log.info("  ✅ DB_USERNAME: {}", dbUsername);
        }

        if (dbPassword.isBlank()) {
            errors.add("DB_PASSWORD is not set");
        } else {
            log.info("  ✅ DB_PASSWORD: [REDACTED]");
        }

        if (dbPort.isBlank()) {
            log.warn("  ⚠️  DB_PORT not set, using default 3306");
        } else {
            log.info("  ✅ DB_PORT: {}", dbPort);
        }

        // Test actual database connectivity
        try (Connection conn = dataSource.getConnection()) {
            log.info("  ✅ Database connection successful");
        } catch (Exception e) {
            errors.add("Database connection failed: " + e.getMessage());
            log.error("  ❌ Database connection failed: {}", e.getMessage());
        }
    }

    private void validateJwtConfig(List<String> errors, boolean isProduction) {
        log.info("Validating JWT configuration...");

        if (jwtSecret.isBlank()) {
            errors.add("JWT_SECRET is not set");
            log.error("  ❌ JWT_SECRET is not set");
        } else if (jwtSecret.equals("CHANGE_ME_IN_PRODUCTION") ||
                   jwtSecret.equals("please-override-this-with-a-long-random-secret-in-every-environment") ||
                   jwtSecret.equals("dev-secret-key-for-local-testing-min-32-chars") ||
                   jwtSecret.equals("temp-secret-32chars-minimum") ||
                   jwtSecret.equals("temp-secret-for-initial-deploy-32chars")) {
            if (isProduction) {
                errors.add("JWT_SECRET is using insecure default value - MUST be changed for production");
                log.error("  ❌ JWT_SECRET is using default value - insecure for production!");
            } else {
                log.warn("  ⚠️  JWT_SECRET is using default value");
            }
        } else if (jwtSecret.length() < 16) {
            errors.add("JWT_SECRET must be at least 16 characters (current: " + jwtSecret.length() + ")");
            log.error("  ❌ JWT_SECRET too short: {} characters (minimum: 16)", jwtSecret.length());
        } else {
            log.info("  ✅ JWT_SECRET length: {} characters", jwtSecret.length());
        }
    }

    private void validateCorsConfig(List<String> errors) {
        log.info("Validating CORS configuration...");

        if (corsAllowedOrigins.isBlank()) {
            log.warn("  ⚠️  CORS_ALLOWED_ORIGINS is not set - CORS will be disabled");
        } else {
            log.info("  ✅ CORS_ALLOWED_ORIGINS: {}", corsAllowedOrigins);
        }
    }

    private String maskHost(String host) {
        if (host != null && host.contains(".")) {
            String[] parts = host.split("\\.");
            if (parts.length > 2) {
                return parts[0] + ".***." + parts[parts.length - 1];
            }
        }
        return host;
    }
}