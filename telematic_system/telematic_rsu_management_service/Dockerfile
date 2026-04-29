FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /rsu_management_service

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /rsu_management_service

RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

COPY --from=build /rsu_management_service/target/telematic_rsu_management_service-*.jar /rsu_management_service/app.jar

EXPOSE 8082

ENTRYPOINT ["java", "-jar", "/rsu_management_service/app.jar"]
#test
