package com.jumpstart.config;

import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.springframework.boot.autoconfigure.flyway.FlywayProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

/**
 * Custom Flyway configuration with better error handling and logging.
 * Uses Spring Boot's auto-configuration instead of custom beans.
 */
@Slf4j
@Configuration
public class FlywayConfiguration {

    @Bean
    @ConfigurationProperties(prefix = "spring.flyway")
    public FlywayProperties flywayProperties() {
        return new FlywayProperties();
    }
}