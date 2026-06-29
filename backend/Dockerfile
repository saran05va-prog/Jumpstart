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

# Health check - uses PORT env var (handles Railway's dynamic port assignment)
HEALTHCHECK --interval=30s --timeout=3s --start-period=90s --retries=5 \
  CMD wget -qO- http://localhost:$PORT/api/health || exit 1

# Run using shell to properly expand environment variables
# IMPORTANT: Do NOT pass -Dserver.port - let application-prod.yml read $PORT directly
CMD exec java -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 \
  -XX:+HeapDumpOnOutOfMemoryError \
  -XX:HeapDumpPath=/tmp/heapdump.hprof \
  -jar app.jar