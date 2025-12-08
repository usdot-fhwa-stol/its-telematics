package com.telematic.telematic_rsu_management_service;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Profile;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.containers.GenericContainer;

@TestConfiguration(proxyBeanMethods = false)
@Profile("tc")
public class TestcontainersConfiguration {

	@Bean
	@ServiceConnection
	MySQLContainer<?> mysqlContainer() {
		return new MySQLContainer<>(DockerImageName.parse("mysql:latest"));
	}

	@Bean
	GenericContainer<?> natsContainer() {
		GenericContainer<?> nats = new GenericContainer<>(DockerImageName.parse("nats:2.10"))
				.withExposedPorts(4222)
				.withCommand("-DV");
		nats.start();
		String uri = String.format("nats://%s:%d", nats.getHost(), nats.getMappedPort(4222));
		System.setProperty("messaging.nats.enabled", "true");
		System.setProperty("messaging.nats.uri", uri);
		return nats;
	}
}
