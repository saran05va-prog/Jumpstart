# =============================================================================
# Build Stage - Compile and package the application
# =============================================================================
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /workspace

# Copy pom.xml first for better layer caching
COPY pom.xml .
RUN mvn -B dependency:go-offline -q

# Copy source code
COPY src ./src

# Build the application
RUN mvn -B clean package -DskipTests -q

# =============================================================================
# Runtime Stage - Run the application
# =============================================================================
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -S jumpstart && adduser -S jumpstart -G jumpstart

# Copy the built artifact
COPY --from=build /workspace/target/jumpstart-backend.jar app.jar
RUN chown jumpstart:jumpstart app.jar

# Switch to non-root user
USER jumpstart

# -----------------------------------------------------------------------------
# Railway PORT Configuration
# Railway sets the PORT environment variable dynamically (e.g., 24638)
# We default to 8080 but Railway will override this
# -----------------------------------------------------------------------------
ENV PORT=8080

EXPOSE ${PORT}

# -----------------------------------------------------------------------------
# Health Check
# Uses the dynamic PORT variable for Railway compatibility
# -----------------------------------------------------------------------------
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=5 \
  CMD wget -qO- http://localhost:${PORT}/api/health 2>/dev/null || wget -qO- http://localhost:8080/api/health 2>/dev/null || exit 1

# -----------------------------------------------------------------------------
# JVM Configuration
# - UseContainerSupport: Better CPU/memory management in containers
# - MaxRAMPercentage: Use 75% of container memory (adjust based on Railway plan)
# - server.port: Bind to Railway's PORT dynamically
# -----------------------------------------------------------------------------
ENTRYPOINT ["sh", "-c", "\
  exec java \
    $JAVA_OPTS \
    -XX:+UseContainerSupport \
    -XX:MaxRAMPercentage=75.0 \
    -XX:+UseStringDeduplication \
    -XX:+HeapDumpOnOutOfMemoryError \
    -XX:+ExitOnOutOfMemoryError \
    -Dserver.port=${PORT} \
    -Djava.rmi.server.hostname=127.0.0.1 \
    -Dsun.rmi.transport.tcp.readTimeout=10000 \
    -jar app.jar \
    --server.error.include-message=always \
    --server.error.include-stacktrace=${DEBUG:-false} \
    --server.shutdown=graceful \
    --spring.jpa.open-in-view=false \
    --logging.level.root=INFO \
    --logging.level.com.jumpstart=INFO \
    --logging.pattern.console=%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n \
"]

# Labels for better container management
LABEL maintainer="jumpstart"
LABEL description="Jumpstart Learning OS - Backend API"
LABEL version="0.1.0"