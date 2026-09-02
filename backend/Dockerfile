# Multi-stage Dockerfile con Amazon Corretto 17 para backend/
FROM maven:3.9.6-amazoncorretto-17 AS build
WORKDIR /app

COPY . .
RUN mvn clean package -DskipTests -Dmaven.wagon.http.ssl.insecure=true -Dmaven.wagon.http.ssl.allowall=true -Dmaven.wagon.http.ssl.ignore.validity.dates=true

FROM amazoncorretto:17-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENV PORT=8080
ENV SPRING_PROFILES_ACTIVE=neon

ENTRYPOINT ["java", "-jar", "app.jar"]
