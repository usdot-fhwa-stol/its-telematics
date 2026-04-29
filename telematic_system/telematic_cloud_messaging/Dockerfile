FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /telematic_cloud_messaging
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /telematic_cloud_messaging
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring
COPY --from=build /telematic_cloud_messaging/target/telematic_cloud_messaging-*.jar /telematic_cloud_messaging/app.jar
COPY --from=build /telematic_cloud_messaging/src/main/resources/application.properties /telematic_cloud_messaging/application.properties
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "/telematic_cloud_messaging/app.jar"]
