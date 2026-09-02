# Multi-stage Dockerfile con Amazon Corretto 17 (Cero fallos SSL/cacerts en Render)
FROM maven:3.9.6-amazoncorretto-17 AS build
WORKDIR /app

# Copiar repositorio completo
COPY . .

# Compilar proyecto Spring Boot omitiendo tests y desactivando bloqueos SSL de certificados
WORKDIR /app/backend
RUN mvn clean package -DskipTests -Dmaven.wagon.http.ssl.insecure=true -Dmaven.wagon.http.ssl.allowall=true -Dmaven.wagon.http.ssl.ignore.validity.dates=true

# Imagen de ejecución ultraligera Amazon Corretto Alpine
FROM amazoncorretto:17-alpine
WORKDIR /app
COPY --from=build /app/backend/target/*.jar app.jar

EXPOSE 8080
ENV PORT=8080
ENV SPRING_PROFILES_ACTIVE=neon

ENTRYPOINT ["java", "-jar", "app.jar"]
