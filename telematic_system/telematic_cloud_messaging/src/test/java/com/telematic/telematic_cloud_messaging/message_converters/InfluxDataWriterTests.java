package com.telematic.telematic_cloud_messaging.message_converters;

import static org.junit.Assert.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;

import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import com.telematic.telematic_cloud_messaging.nats_influx_connection.Config;
import com.telematic.telematic_cloud_messaging.nats_influx_connection.InfluxDataWriter;



@ActiveProfiles("test")
@SpringBootTest
@TestPropertySource(properties = {
    "logging.level.root=INFO",
    "MESSAGING_LOGGING_LEVEL=INFO",
    "NATS_URL=nats://localhost:4222",
    "MESSAGING_NATS_MAX_RECONNECTS=5",
    "MESSAGING_INFLUX_BUCKET_TYPE=ALL",
    "INFLUXDB_HOST=localhost",
    "INFLUXDB_PORT=8086",
    "DOCKER_INFLUXDB_INIT_USERNAME=admin",
    "DOCKER_INFLUXDB_INIT_PASSWORD=P@ssword1",
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
    "DOCKER_INFLUXDB_INIT_ORG=my-org",
    "DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=my-super-secret-auth-token",
    "MESSAGING_TO_STR_FIELDS=hostBSMId,TrafficControlRequest.reqid,tcmV01.reqid,m_header.sender_bsm_id,core_data.id",
    "MESSAGING_IGNORE_FIELDS=payload.MessageFrame.value.PersonalSafetyMessage.id",
    "MESSAGING_INFLUX_CONNECT_TIMEOUT=1000",
    "MESSAGING_INFLUX_WRITE_TIMEOUT=1000",
    "MESSAGING_DB_DRIVER=com.mysql.cj.jdbc.Driver",
    "MYSQL_HOST=localhost",
    "MYSQL_PORT=3307",
    "MYSQL_DATABASE=wfd_grafana",
    "MYSQL_USER=telematic",
    "MYSQL_PASSWORD=telematic",
    "MESSAGING_DB_DIALECT=org.hibernate.dialect.MySQLDialect"
})
public class InfluxDataWriterTests {
    String influx_uri =  "http://52.71.82.177:8086";
    String influx_username = "admin";
    String influx_pwd = "adminpwd";
    String influx_bucket = "infrastructure-dev";
    String influx_org =  "my-org";
    String influx_org_id = "12bdc4164c2e8141";
    String influx_token = "iJwbytxMMQ1PpecjvVSRgbK1xUaDeZvU6DLHfXkoezqUfZfVYc8Q1nTIISceFmWvjcJA8NCPX_FMAm2Zw0Q5UA==";
    int connect_timeout = 10;
    int write_timeout = 10;
    
    JSONFlattenerHelper jsonFlattener = new JSONFlattenerHelper();
    JSON2KeyValuePairsConverter keyValueConverter = new JSON2KeyValuePairsConverter();
   
    @Test
    public void influxConnectTest() {        
        try {
            Config config = new Config();
            Config.BucketType bucket_type = Config.BucketType.PLATFORM;
              
            InfluxDataWriter influxDataWriter = new InfluxDataWriter(config, bucket_type);
                  
            assertTrue(influxDataWriter.getInfluxConnected() == false);

            influxDataWriter.influxConnect();
            assertTrue(influxDataWriter.getInfluxConnected() == true);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Test
    public void influxRecordTest() {        
        try {           
            Config config = new Config();
            Config.BucketType bucket_type = Config.BucketType.STREETS;
            InfluxDataWriter influxDataWriter = new InfluxDataWriter(config, bucket_type);

            String kafka_str = "{\"payload\":{\"metadata\":{\"timestamp\":\"1664295886951\",\"intersection_type\":\"Carma/stop_controlled_intersection\"}, \"payload\":\"\"}, \"unit_id\":\"kafka_id\",\"unit_type\":\"infrastructure\",\"unit_name\":\"West Intersection\",\"event_name\":\"UC3\",\"location\":\"TFHRC\", \"testing_type\":\"Integration\",\"msg_type\":\"v2xhub_scheduling_plan_sub\",\"topic_name\":\"v2xhub_scheduling_plan_sub\",\"timestamp\":\"1664389254620257.0\"}";
            String converted_str = influxDataWriter.influxStringConverter(kafka_str);
            String correct_str = "UC3,unit_id=kafka_id,unit_type=infrastructure,location=TFHRC,testing_type=Integration,topic_name=v2xhub_scheduling_plan_sub payload=\"NA\",metadata.intersection_type=\"Carma/stop_controlled_intersection\",metadata.timestamp=1664295886951 1664389254620257";

            assertEquals(converted_str, correct_str);

            System.out.println("Received this string: " + converted_str);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Test
    public void influxCloudTest() {
        try {
            
            Config config = new Config();
            Config.BucketType bucket_type = Config.BucketType.CLOUD;
            InfluxDataWriter influxDataWriter = new InfluxDataWriter(config, bucket_type);

            String input_json_string = "{\"TrafficControlMessageList\":{\"TrafficControlMessage\":[{\"tcmV01\":{\"reqid\":102030405060708,\"reqseq\":0,\"msgtot\":6,\"msgnum\":1,\"id\":\"001698403caedb603139c0f158992a7d\",\"updated\":0,\"package\":{\"label\":\"platformtest\",\"tcids\":{\"Id128b\":\"001698403caedb603139c0f158992a7d\"}},\"params\":{\"vclasses\":{\"micromobile\":\"\",\"motorcycle\":\"\",\"passenger-car\":\"\",\"light-truck-van\":\"\",\"bus\":\"\",\"two-axle-six-tire-single-unit-truck\":\"\",\"three-axle-single-unit-truck\":\"\",\"four-or-more-axle-single-unit-truck\":\"\",\"four-or-fewer-axle-single-trailer-truck\":\"\",\"five-axle-single-trailer-truck\":\"\",\"six-or-more-axle-single-trailer-truck\":\"\",\"five-or-fewer-axle-multi-trailer-truck\":\"\",\"six-axle-multi-trailer-truck\":\"\",\"seven-or-more-axle-multi-trailer-truck\":\"\"},\"schedule\":{\"start\":27813460,\"end\":153722867280912,\"dow\":1111111},\"regulatory\":{\"true\":\"\"},\"detail\":{\"closed\":{\"notopen\":\"\"}}},\"geometry\":{\"proj\":\"epsg:3785\",\"datum\":\"WGS84\",\"reftime\":27813460,\"reflon\":-771498705,\"reflat\":389551653,\"refelv\":0,\"refwidth\":382,\"heading\":3312,\"nodes\":{\"PathNode\":[{\"x\":1,\"y\":0,\"width\":0},{\"x\":-1260,\"y\":802,\"width\":3},{\"x\":-1176,\"y\":923,\"width\":2},{\"x\":-248,\"y\":226,\"width\":-2}]}}}},{\"tcmV01\":{\"reqid\":102030405060708,\"reqseq\":0,\"msgtot\":6,\"msgnum\":2,\"id\":\"0052b25d169a4a00c71c038fa70abbd7\",\"updated\":0,\"package\":{\"label\":\"workzone\",\"tcids\":{\"Id128b\":\"0052b25d169a4a00c71c038fa70abbd7\"}},\"params\":{\"vclasses\":{\"micromobile\":\"\",\"motorcycle\":\"\",\"passenger-car\":\"\",\"light-truck-van\":\"\",\"bus\":\"\",\"two-axle-six-tire-single-unit-truck\":\"\",\"three-axle-single-unit-truck\":\"\",\"four-or-more-axle-single-unit-truck\":\"\",\"four-or-fewer-axle-single-trailer-truck\":\"\",\"five-axle-single-trailer-truck\":\"\",\"six-or-more-axle-single-trailer-truck\":\"\",\"five-or-fewer-axle-multi-trailer-truck\":\"\",\"six-axle-multi-trailer-truck\":\"\",\"seven-or-more-axle-multi-trailer-truck\":\"\"},\"schedule\":{\"start\":27830621,\"end\":153722867280912,\"dow\":1111111},\"regulatory\":{\"true\":\"\"},\"detail\":{\"maxspeed\":45}},\"geometry\":{\"proj\":\"epsg:3785\",\"datum\":\"WGS84\",\"reftime\":27830621,\"reflon\":-771509819,\"reflat\":389557957,\"refelv\":0,\"refwidth\":413,\"heading\":3312,\"nodes\":{\"PathNode\":[{\"x\":1,\"y\":0,\"width\":0},{\"x\":322,\"y\":18,\"width\":-16}]}}}},{\"tcmV01\":{\"reqid\":102030405060708,\"reqseq\":0,\"msgtot\":6,\"msgnum\":3,\"id\":\"00242a9dc147efc795dbb8a5dda83e33\",\"updated\":0,\"package\":{\"label\":\"workzone\",\"tcids\":{\"Id128b\":\"00242a9dc147efc795dbb8a5dda83e33\"}},\"params\":{\"vclasses\":{\"micromobile\":\"\",\"motorcycle\":\"\",\"passenger-car\":\"\",\"light-truck-van\":\"\",\"bus\":\"\",\"two-axle-six-tire-single-unit-truck\":\"\",\"three-axle-single-unit-truck\":\"\",\"four-or-more-axle-single-unit-truck\":\"\",\"four-or-fewer-axle-single-trailer-truck\":\"\",\"five-axle-single-trailer-truck\":\"\",\"six-or-more-axle-single-trailer-truck\":\"\",\"five-or-fewer-axle-multi-trailer-truck\":\"\",\"six-axle-multi-trailer-truck\":\"\",\"seven-or-more-axle-multi-trailer-truck\":\"\"},\"schedule\":{\"start\":27830622,\"end\":153722867280912,\"dow\":1111111},\"regulatory\":{\"true\":\"\"},\"detail\":{\"maxspeed\":45}},\"geometry\":{\"proj\":\"epsg:3785\",\"datum\":\"WGS84\",\"reftime\":27830622,\"reflon\":-771509776,\"reflat\":389557959,\"refelv\":0,\"refwidth\":411,\"heading\":3312,\"nodes\":{\"PathNode\":[{\"x\":1,\"y\":0,\"width\":-1},{\"x\":1488,\"y\":-38,\"width\":-31},{\"x\":1426,\"y\":-421,\"width\":16},{\"x\":1281,\"y\":-765,\"width\":18},{\"x\":1104,\"y\":-1003,\"width\":-37},{\"x\":749,\"y\":-1153,\"width\":-3}]}}}},{\"tcmV01\":{\"reqid\":102030405060708,\"reqseq\":0,\"msgtot\":6,\"msgnum\":4,\"id\":\"0033d7ce1c56cbe32b0f94d1d4d0d23e\",\"updated\":0,\"package\":{\"label\":\"workzone\",\"tcids\":{\"Id128b\":\"0033d7ce1c56cbe32b0f94d1d4d0d23e\"}},\"params\":{\"vclasses\":{\"motorcycle\":\"\",\"passenger-car\":\"\",\"light-truck-van\":\"\",\"bus\":\"\",\"two-axle-six-tire-single-unit-truck\":\"\",\"three-axle-single-unit-truck\":\"\",\"four-or-more-axle-single-unit-truck\":\"\",\"four-or-fewer-axle-single-trailer-truck\":\"\",\"five-axle-single-trailer-truck\":\"\",\"six-or-more-axle-single-trailer-truck\":\"\",\"five-or-fewer-axle-multi-trailer-truck\":\"\",\"six-axle-multi-trailer-truck\":\"\",\"seven-or-more-axle-multi-trailer-truck\":\"\"},\"schedule\":{\"start\":27830632,\"end\":153722867280912,\"dow\":1111111},\"regulatory\":{\"true\":\"\"},\"detail\":{\"maxspeed\":45}},\"geometry\":{\"proj\":\"epsg:3785\",\"datum\":\"WGS84\",\"reftime\":27830632,\"reflon\":-771503828,\"reflat\":389554968,\"refelv\":0,\"refwidth\":371,\"heading\":3312,\"nodes\":{\"PathNode\":[{\"x\":1,\"y\":0,\"width\":0},{\"x\":917,\"y\":-1182,\"width\":2},{\"x\":1027,\"y\":-1090,\"width\":2},{\"x\":1074,\"y\":-1040,\"width\":3},{\"x\":1167,\"y\":-930,\"width\":2},{\"x\":1264,\"y\":-800,\"width\":2},{\"x\":1334,\"y\":-673,\"width\":3},{\"x\":1384,\"y\":-571,\"width\":4},{\"x\":1322,\"y\":-524,\"width\":1}]}}}},{\"tcmV01\":{\"reqid\":102030405060708,\"reqseq\":0,\"msgtot\":6,\"msgnum\":5,\"id\":\"00b270eac7e965b98fbdc283006e41dd\",\"updated\":0,\"package\":{\"label\":\"workzone\",\"tcids\":{\"Id128b\":\"00b270eac7e965b98fbdc283006e41dd\"}},\"params\":{\"vclasses\":{\"micromobile\":\"\",\"motorcycle\":\"\",\"passenger-car\":\"\",\"light-truck-van\":\"\",\"bus\":\"\",\"two-axle-six-tire-single-unit-truck\":\"\",\"three-axle-single-unit-truck\":\"\",\"four-or-more-axle-single-unit-truck\":\"\",\"four-or-fewer-axle-single-trailer-truck\":\"\",\"five-axle-single-trailer-truck\":\"\",\"six-or-more-axle-single-trailer-truck\":\"\",\"five-or-fewer-axle-multi-trailer-truck\":\"\",\"six-axle-multi-trailer-truck\":\"\",\"seven-or-more-axle-multi-trailer-truck\":\"\"},\"schedule\":{\"start\":27818963,\"end\":153722867280912,\"dow\":1111111},\"regulatory\":{\"true\":\"\"},\"detail\":{\"maxspeed\":90}},\"geometry\":{\"proj\":\"epsg:3785\",\"datum\":\"WGS84\",\"reftime\":27818963,\"reflon\":-771490953,\"reflat\":389549263,\"refelv\":0,\"refwidth\":396,\"heading\":3312,\"nodes\":{\"PathNode\":[{\"x\":1,\"y\":0,\"width\":0},{\"x\":1476,\"y\":-248,\"width\":15},{\"x\":1484,\"y\":-190,\"width\":22},{\"x\":1489,\"y\":-132,\"width\":18},{\"x\":1493,\"y\":-67,\"width\":5},{\"x\":1494,\"y\":-20,\"width\":-8},{\"x\":1492,\"y\":83,\"width\":-12},{\"x\":1490,\"y\":148,\"width\":-6},{\"x\":1484,\"y\":206,\"width\":-2},{\"x\":1475,\"y\":248,\"width\":-9},{\"x\":1040,\"y\":207,\"width\":-3}]}}}},{\"tcmV01\":{\"reqid\":102030405060708,\"reqseq\":0,\"msgtot\":6,\"msgnum\":6,\"id\":\"007dfe6e1f6d35f8f72d6ff4832d043a\",\"updated\":0,\"package\":{\"label\":\"workzone\",\"tcids\":{\"Id128b\":\"007dfe6e1f6d35f8f72d6ff4832d043a\"}},\"params\":{\"vclasses\":{\"micromobile\":\"\",\"motorcycle\":\"\",\"passenger-car\":\"\",\"light-truck-van\":\"\",\"bus\":\"\",\"two-axle-six-tire-single-unit-truck\":\"\",\"three-axle-single-unit-truck\":\"\",\"four-or-more-axle-single-unit-truck\":\"\",\"four-or-fewer-axle-single-trailer-truck\":\"\",\"five-axle-single-trailer-truck\":\"\",\"six-or-more-axle-single-trailer-truck\":\"\",\"five-or-fewer-axle-multi-trailer-truck\":\"\",\"six-axle-multi-trailer-truck\":\"\",\"seven-or-more-axle-multi-trailer-truck\":\"\"},\"schedule\":{\"start\":27817693,\"end\":153722867280912,\"dow\":1111111},\"regulatory\":{\"true\":\"\"},\"detail\":{\"maxspeed\":9}},\"geometry\":{\"proj\":\"epsg:3785\",\"datum\":\"WGS84\",\"reftime\":27817693,\"reflon\":-771484526,\"reflat\":389548802,\"refelv\":0,\"refwidth\":450,\"heading\":3312,\"nodes\":{\"PathNode\":[{\"x\":1,\"y\":0,\"width\":0},{\"x\":1494,\"y\":60,\"width\":-10},{\"x\":1490,\"y\":134,\"width\":-6},{\"x\":1484,\"y\":208,\"width\":-6},{\"x\":1478,\"y\":236,\"width\":-5},{\"x\":1469,\"y\":287,\"width\":-9},{\"x\":1468,\"y\":298,\"width\":-4},{\"x\":939,\"y\":191,\"width\":-2}]}}}}]}}";
            JSONObject payload_val = new JSONObject(input_json_string);

            JSONObject str_map = new JSONObject();
            str_map.put("payload", payload_val);
            str_map.put("unit_id", "123");
            str_map.put("unit_type", "cloud");
            str_map.put("unit_name","cloud");
            str_map.put("msg_type","new_carma_cloud_message_type");
            str_map.put("event_name","event");
            str_map.put("testing_type","unit_test");
            str_map.put("location","unit_test");
            str_map.put("topic_name","topic");
            str_map.put("timestamp",1984);
            str_map.put("log_timestamp",1984);

            List<String> split_tcm_list = influxDataWriter.convertCloudDataToString(str_map.toString());
            assertEquals(6, split_tcm_list.size());

            String input_json_string_2 = "{\"TrafficControlMessageList\":{\"TrafficControlMessage\":{\"tcmV01\":{\"reqid\":102030405060708,\"reqseq\":0,\"msgtot\":6,\"msgnum\":1,\"id\":\"001698403caedb603139c0f158992a7d\",\"updated\":0,\"package\":{\"label\":\"platformtest\",\"tcids\":{\"Id128b\":\"001698403caedb603139c0f158992a7d\"}},\"params\":{\"vclasses\":{\"micromobile\":\"\",\"motorcycle\":\"\",\"passenger-car\":\"\",\"light-truck-van\":\"\",\"bus\":\"\",\"two-axle-six-tire-single-unit-truck\":\"\",\"three-axle-single-unit-truck\":\"\",\"four-or-more-axle-single-unit-truck\":\"\",\"four-or-fewer-axle-single-trailer-truck\":\"\",\"five-axle-single-trailer-truck\":\"\",\"six-or-more-axle-single-trailer-truck\":\"\",\"five-or-fewer-axle-multi-trailer-truck\":\"\",\"six-axle-multi-trailer-truck\":\"\",\"seven-or-more-axle-multi-trailer-truck\":\"\"},\"schedule\":{\"start\":27813460,\"end\":153722867280912,\"dow\":1111111},\"regulatory\":{\"true\":\"\"},\"detail\":{\"closed\":{\"notopen\":\"\"}}},\"geometry\":{\"proj\":\"epsg:3785\",\"datum\":\"WGS84\",\"reftime\":27813460,\"reflon\":-771498705,\"reflat\":389551653,\"refelv\":0,\"refwidth\":382,\"heading\":3312,\"nodes\":{\"PathNode\":[{\"x\":1,\"y\":0,\"width\":0},{\"x\":-1260,\"y\":802,\"width\":3},{\"x\":-1176,\"y\":923,\"width\":2},{\"x\":-248,\"y\":226,\"width\":-2}]}}}}}}";
            JSONObject payload_val_2 = new JSONObject(input_json_string_2);

            str_map.remove("payload");
            str_map.put("payload", payload_val_2);
            List<String> split_tcm_list_2 = influxDataWriter.convertCloudDataToString(str_map.toString());
            assertEquals(1, split_tcm_list_2.size());
    



        }catch (Exception e) {
            e.printStackTrace();
        }
    }
}
