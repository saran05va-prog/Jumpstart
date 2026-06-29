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

# Default port - Railway will override with PORT env var
ENV PORT=8080

EXPOSE 8080

# Health check using default port 8080 as fallback
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=5 \
  CMD wget -qO- http://localhost:8080/api/health || exit 1

# Run using shell to properly expand environment variables
CMD exec java -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+HeapDumpOnOutOfMemoryError -Dserver.port=$PORT -jar app.jar