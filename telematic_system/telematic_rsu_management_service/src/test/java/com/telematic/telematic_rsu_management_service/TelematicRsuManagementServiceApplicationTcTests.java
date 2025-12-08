package com.telematic.telematic_rsu_management_service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("tc")
@ContextConfiguration(classes = TestcontainersConfiguration.class)
class TelematicRsuManagementServiceApplicationTcTestsTest {

    @Test
    void contextLoadsWithTestcontainers() {
        assertTrue(true, "Spring context should load successfully with Testcontainers");
    }
}