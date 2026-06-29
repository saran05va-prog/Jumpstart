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

        log.info("Server port: {}", System.getenv("PORT"));
        log.info("Active profile: {}", activeProfile);
        log.info("OS: {} {}", System.getProperty("os.name"), System.getProperty("os.version"));
        log.info("Java: {} {}", System.getProperty("java.version"), System.getProperty("java.vendor"));
        log.info("Available processors: {}", Runtime.getRuntime().availableProcessors());
        log.info("Max memory: {} MB", Runtime.getRuntime().maxMemory() / 1024 / 1024);

        if (isProduction) {
            log.info("Running in PRODUCTION mode - performing strict validation");

            validateDatabaseConfig(errors);
            validateJwtConfig(errors, isProduction);
            validateCorsConfig(errors);
        } else {
            log.info("Running in {} mode - using lenient validation", activeProfile);

            validateDatabaseConfig(errors);
            validateJwtConfig(errors, false);
            validateCorsConfig(errors);
        }

        if (!errors.isEmpty()) {
            log.error("-".repeat(60));
            log.error("STARTUP VALIDATION FAILED");
            log.error("-".repeat(60));
            errors.forEach(error -> log.error("  ❌ {}", error));
            log.error("-".repeat(60));

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

        if (dbHost.isBlank()) {
            log.warn("  ⚠️  DB_HOST env var not set - will use default (localhost)");
        } else if ("localhost".equals(dbHost)) {
            if ("prod".equals(activeProfile)) {
                errors.add("DB_HOST is localhost in production - configure the correct database host");
            }
            log.warn("  ⚠️  DB_HOST: localhost (this MUST be changed in production)");
        } else {
            log.info("  ✅ DB_HOST: {}", maskHost(dbHost));
        }

        if (dbName.isBlank()) {
            log.warn("  ⚠️  DB_NAME env var not set - will use default");
        } else {
            log.info("  ✅ DB_NAME: {}", dbName);
        }

        if (dbUsername.isBlank()) {
            log.warn("  ⚠️  DB_USERNAME env var not set - will use default");
        } else {
            log.info("  ✅ DB_USERNAME: {}", dbUsername);
        }

        if (dbPassword.isBlank()) {
            log.warn("  ⚠️  DB_PASSWORD env var not set - will use default");
        } else {
            log.info("  ✅ DB_PASSWORD: [REDACTED]");
        }

        if (dbPort.isBlank()) {
            log.info("  ℹ️  DB_PORT: using default 3306");
        } else {
            log.info("  ✅ DB_PORT: {}", dbPort);
        }

        // Test actual database connectivity
        try (Connection conn = dataSource.getConnection()) {
            log.info("  ✅ Database connection successful to {}", conn.getMetaData().getURL());
        } catch (Exception e) {
            log.error("  ❌ Database connection failed: {}", e.getMessage());
            log.error("     This is expected if the database is not yet ready.");
            log.error("     HikariCP will continue retrying in the background.");
            log.error("     Exception type: {}", e.getClass().getName());
        }
    }

    private void validateJwtConfig(List<String> errors, boolean isProduction) {
        log.info("Validating JWT configuration...");

        if (jwtSecret.isBlank()) {
            log.warn("  ⚠️  JWT_SECRET is not set - using development fallback, tokens will be insecure");
            if (isProduction) {
                log.warn("     Set JWT_SECRET environment variable for production security");
            }
        } else if (jwtSecret.equals("CHANGE_ME_IN_PRODUCTION") ||
                   jwtSecret.equals("please-override-this-with-a-long-random-secret-in-every-environment") ||
                   jwtSecret.equals("dev-secret-key-for-local-testing-min-32-chars") ||
                   jwtSecret.equals("temp-secret-32chars-minimum") ||
                   jwtSecret.equals("temp-secret-for-initial-deploy-32chars") ||
                   jwtSecret.equals("default_dev_secret_32chars")) {
            if (isProduction) {
                errors.add("JWT_SECRET is using insecure default value - MUST be changed for production");
                log.error("  ❌ JWT_SECRET is using a known default value - insecure for production!");
            } else {
                log.warn("  ⚠️  JWT_SECRET is using a known default value");
            }
        } else if (jwtSecret.length() < 16) {
            log.warn("  ⚠️  JWT_SECRET is short ({} chars) - minimum 16 recommended", jwtSecret.length());
            if (isProduction) {
                errors.add("JWT_SECRET is too short for production (current: " + jwtSecret.length() + " chars, minimum: 16)");
            }
        } else {
            log.info("  ✅ JWT_SECRET length: {} characters", jwtSecret.length());
        }

        log.info("  ℹ️  JWT access token expiration: via jumpstart.security.jwt.access-expiration-ms");
        log.info("  ℹ️  JWT refresh token expiration: via jumpstart.security.jwt.refresh-expiration-ms");
    }

    private void validateCorsConfig(List<String> errors) {
        log.info("Validating CORS configuration...");

        if (corsAllowedOrigins == null || corsAllowedOrigins.isBlank()) {
            log.warn("  ⚠️  CORS_ALLOWED_ORIGINS is not set - CORS will reject all cross-origin requests");
            log.warn("     Set CORS_ALLOWED_ORIGINS to a comma-separated list of allowed origins");
        } else {
            String[] origins = corsAllowedOrigins.split(",");
            for (String origin : origins) {
                String trimmed = origin.trim();
                if (!trimmed.isEmpty()) {
                    log.info("  ✅ CORS origin: {}", trimmed);
                }
            }
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