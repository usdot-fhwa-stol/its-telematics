FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /telematic_cloud_messaging
COPY ./ /telematic_cloud_messaging/
RUN ./mvnw clean package -Dmaven.test.skip=true
RUN mv /telematic_cloud_messaging/target/*.jar app.jar
RUN mv /telematic_cloud_messaging/src/main/resources/application.properties /telematic_cloud_messaging/application.properties
RUN rm -R target
RUN apt update && apt install wait-for-it
EXPOSE 8080
CMD ["java", "-jar", "/telematic_cloud_messaging/app.jar" ]
