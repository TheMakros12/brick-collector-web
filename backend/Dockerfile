# Dockerfile ultraligero y 100% fiable para Render (Single Stage)
FROM amazoncorretto:17-alpine
WORKDIR /app

# Copiar el JAR ejecutable pre-compilado
COPY app.jar app.jar

EXPOSE 8080
ENV PORT=8080
ENV SPRING_PROFILES_ACTIVE=neon

ENTRYPOINT ["java", "-jar", "app.jar"]
