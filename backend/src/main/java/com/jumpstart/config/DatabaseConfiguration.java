package com.jumpstart.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.util.StringUtils;

import javax.sql.DataSource;

/**
 * Database configuration with production-ready defaults.
 * Provides better connection handling and error reporting.
 */
@Slf4j
@Configuration
public class DatabaseConfiguration {

    @Bean
    @Primary
    @ConfigurationProperties("spring.datasource")
    public DataSourceProperties dataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    @Primary
    @ConfigurationProperties("spring.datasource.hikari")
    public DataSource dataSource(DataSourceProperties properties) {
        log.info("Configuring HikariCP DataSource");
        log.info("  JDBC URL: {}", maskJdbcUrl(properties.getUrl()));
        log.info("  Username: {}", properties.getUsername());

        DataSource dataSource = properties
                .initializeDataSourceBuilder()
                .type(com.zaxxer.hikari.HikariDataSource.class)
                .build();

        // Log HikariCP configuration
        if (dataSource instanceof com.zaxxer.hikari.HikariDataSource hikariDS) {
            logHikariConfig(hikariDS);
        }

        return dataSource;
    }

    private void logHikariConfig(com.zaxxer.hikari.HikariDataSource ds) {
        log.info("HikariCP Configuration:");
        log.info("  Maximum Pool Size: {}", ds.getMaximumPoolSize());
        log.info("  Minimum Idle: {}", ds.getMinimumIdle());
        log.info("  Connection Timeout: {}ms", ds.getConnectionTimeout());
        log.info("  Idle Timeout: {}ms", ds.getIdleTimeout());
        log.info("  Max Lifetime: {}ms", ds.getMaxLifetime());
        log.info("  Connection Test Query: {}", ds.getConnectionTestQuery());
    }

    private String maskJdbcUrl(String url) {
        if (!StringUtils.hasText(url)) {
            return "not configured";
        }

        // Mask password in JDBC URL if present
        if (url.contains("@")) {
            int atIndex = url.indexOf('@');
            String before = url.substring(0, url.indexOf("://") + 3);
            String after = url.substring(atIndex);
            return before + "***" + after;
        }

        return url;
    }
}