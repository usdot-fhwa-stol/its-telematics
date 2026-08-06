package com.telematic.telematic_cloud_messaging.message_converters;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import com.telematic.telematic_cloud_messaging.nats_influx_connection.Config;
import com.telematic.telematic_cloud_messaging.nats_influx_connection.NatsInfluxPush;

@ActiveProfiles("test")
@SpringBootTest
@TestPropertySource(properties = {
    "logging.level.root=INFO",
    "MESSAGING_LOGGING_LEVEL=INFO",
    "MESSAGING_NATS_URI=nats://localhost:4222",
    "MESSAGING_NATS_MAX_RECONNECTS=5",
    "MESSAGING_INFLUX_BUCKET_TYPE=ALL",
    "MESSAGING_INFLUX_URI=localhost",
    "MESSAGING_INFLUX_PORT=8086",
    "MESSAGING_INFLUX_USERNAME=admin",
    "MESSAGING_INFLUX_PWD=P@ssword1",
    "MESSAGING_INFLUX_BUCKET_STREETS=infrastructure-dev",
    "MESSAGING_STREETS_SUBSCRIPTION_TOPIC=streets.*.data.",
    "MESSAGING_INFLUX_BUCKET_PLATFORM=platform-dev",
    "MESSAGING_PLATFORM_SUBSCRIPTION_TOPIC=platform.*.data.",
    "MESSAGING_INFLUX_BUCKET_CLOUD=infrastructure-dev",
    "MESSAGING_CLOUD_SUBSCRIPTION_TOPIC=cloud.*.data.",
    "MESSAGING_NUMBER_TOPICS_PER_DISPATCHER=3",
    "MESSAGING_VEHICLE_UNIT_ID_LIST=vehicle_id",
    "MESSAGING_STREETS_UNIT_ID_LIST=kafka_id,rsu_id",
    "MESSAGING_CLOUD_UNIT_ID_LIST=cloud_id",
    "MESSAGING_INFLUX_ORG=my-org",
    "MESSAGING_INFLUX_TOKEN=my-super-secret-auth-token",
    "MESSAGING_TO_STR_FIELDS=hostBSMId,TrafficControlRequest.reqid,tcmV01.reqid,m_header.sender_bsm_id,core_data.id",
    "MESSAGING_IGNORE_FIELDS=payload.MessageFrame.value.PersonalSafetyMessage.id",
    "MESSAGING_INFLUX_CONNECT_TIMEOUT=1000",
    "MESSAGING_INFLUX_WRITE_TIMEOUT=1000",
    "MESSAGING_DB_DRIVER=com.mysql.cj.jdbc.Driver",
    "MESSAGING_DB_URL=jdbc:mysql://localhost:3307/wfd_grafana",
    "MESSAGING_DB_USERNAME=telematic",
    "MESSAGING_DB_PASSWORD=telematic",
    "MESSAGING_DB_DIALECT=org.hibernate.dialect.MySQLDialect"
})
public class NatsinfluxPushTests {
    
    //Template unit test for NatsinfluxPush currently performing any checks
    @Test
    public void NatsInfluxPushTest(){
        NatsInfluxPush nats_influx_push = new NatsInfluxPush();       

        Config.BucketType bucket_type = Config.BucketType.PLATFORM;
        try{
            nats_influx_push.initDataPersistentService(bucket_type);
        }catch(Exception e){
            e.printStackTrace();
        }
        
        bucket_type = Config.BucketType.STREETS;
        try{
            nats_influx_push.initDataPersistentService(bucket_type);
        }catch(Exception e){
            e.printStackTrace();
        }
        
        

    }
}