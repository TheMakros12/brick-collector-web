# Dockerfile Multi-Stage Build para Render.com
# Stage 1: Compilar backend y recursos estaticos del frontend con Maven
FROM maven:3.9.6-eclipse-temurin-17-alpine AS builder
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests -f backend/pom.xml

# Stage 2: Imagen de ejecucion ultraligera
FROM amazoncorretto:17-alpine
WORKDIR /app
COPY --from=builder /app/backend/target/*.jar app.jar

EXPOSE 8080
ENV PORT=8080
ENV SPRING_PROFILES_ACTIVE=neon

ENTRYPOINT ["java", "-jar", "app.jar"]
