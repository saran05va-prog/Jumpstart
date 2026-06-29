# ---- Build stage ---------------------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace

COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests

# ---- Runtime stage --------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S jumpstart && adduser -S jumpstart -G jumpstart

COPY --from=build /workspace/target/jumpstart-backend.jar app.jar
RUN chown jumpstart:jumpstart app.jar

USER jumpstart

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -XX:+UseContainerSupport -XX:MaxRAMPercentage=75 -jar app.jar"]
