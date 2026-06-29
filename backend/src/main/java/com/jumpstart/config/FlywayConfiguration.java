package com.jumpstart.config;

import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.flyway.FlywayProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

/**
 * Custom Flyway configuration with better error handling and logging.
 */
@Slf4j
@Configuration
public class FlywayConfiguration {

    @Bean
    @ConfigurationProperties(prefix = "spring.flyway")
    public FlywayProperties flywayProperties() {
        return new FlywayProperties();
    }

    @Bean
    @Primary
    @DependsOn("dataSource")
    public Flyway flyway(DataSource dataSource, FlywayProperties properties) {
        log.info("=".repeat(60));
        log.info("FLYWAY CONFIGURATION");
        log.info("=".repeat(60));
        log.info("  Enabled: {}", properties.isEnabled());
        log.info("  Locations: {}", properties.getLocations());
        log.info("  Baseline on migrate: {}", properties.isBaselineOnMigrate());
        log.info("  Clean disabled: {}", properties.isCleanDisabled());

        if (!properties.isEnabled()) {
            log.info("Flyway is disabled - skipping database migrations");
            return null;
        }

        try {
            Flyway flyway = Flyway.configure()
                    .dataSource(dataSource)
                    .locations(properties.getLocations().toArray(new String[0]))
                    .baselineOnMigrate(properties.isBaselineOnMigrate())
                    .cleanDisabled(properties.isCleanDisabled())
                    .outOfOrder(properties.isOutOfOrder())
                    .baselineOnMigrate(true)
                    .load();

            // Execute migration
            log.info("Executing Flyway migrations...");
            var result = flyway.migrate();
            log.info("✅ Flyway migration result: {} migrations applied", result);

            // Log pending migrations if any
            MigrationInfo[] pending = flyway.info().pending();
            if (pending != null && pending.length > 0) {
                log.warn("⚠️  {} pending migrations:", pending.length);
                for (MigrationInfo m : pending) {
                    log.warn("   - {}: {}", m.getVersion(), m.getDescription());
                }
            }

            // Log applied migrations
            MigrationInfo[] applied = flyway.info().applied();
            if (applied != null && applied.length > 0) {
                log.info("✅ {} applied migrations:", applied.length);
                for (MigrationInfo m : applied) {
                    log.info("   - {}: {}", m.getVersion(), m.getDescription());
                }
            }

            log.info("=".repeat(60));
            log.info("FLYWAY MIGRATION COMPLETE");
            log.info("=".repeat(60));

            return flyway;

        } catch (Exception e) {
            log.error("-".repeat(60));
            log.error("❌ FLYWAY MIGRATION FAILED");
            log.error("-".repeat(60));
            log.error("Error: {}", e.getMessage());
            log.error("-".repeat(60));

            // In production, fail fast. In dev, log warning and continue.
            String profile = System.getProperty("spring.profiles.active", "unknown");
            if ("prod".equalsIgnoreCase(profile)) {
                throw new IllegalStateException(
                    "Flyway migration failed. Fix the database before redeploying:\n" +
                    e.getMessage()
                );
            } else {
                log.warn("⚠️  Continuing despite migration failure in development mode");
                log.warn("   Note: This may cause runtime issues if schema is not correct");
                return null;
            }
        }
    }
}