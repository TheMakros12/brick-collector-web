# Multi-stage Dockerfile para despliegue automático en Render
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copiar todo el repositorio (backend y frontend)
COPY . .

# Compilar proyecto Spring Boot con frontend empaquetado
WORKDIR /app/backend
RUN mvn clean package -DskipTests

# Imagen de ejecución ultraligera con Java 17 JRE
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/backend/target/*.jar app.jar

EXPOSE 8080
ENV PORT=8080
ENV SPRING_PROFILES_ACTIVE=neon

ENTRYPOINT ["java", "-jar", "app.jar"]
