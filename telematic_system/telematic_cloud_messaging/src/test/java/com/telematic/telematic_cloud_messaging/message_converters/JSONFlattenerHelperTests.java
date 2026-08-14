package com.telematic.telematic_cloud_messaging.message_converters;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

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
public class JSONFlattenerHelperTests {
    @Autowired
    JSONFlattenerHelper helper;

    @Test
    public void flattenJson() {
        String json_metadata_str = "{\"unit_name\":\"BlackPacifica\",\"event_name\":\"UC3\",\"location\":\"TFHRC\",\"unit_type\":\"Platform\",\"unit_id\":\"DOT-508\",\"testing_type\":\"Integration\"}";
        String BSM_json_payload_str = "{\"core_data\":{\"accel_set\":{\"lat\":\"2\",\"long\":\"-79\",\"vert\":\"-127\",\"yaw\":\"12\"},\"accuracy\":{\"orientation\":\"65535\",\"semi_major\":\"255\",\"semi_minor\":\"255\"},\"angle\":\"127\",\"brakes\":{\"abs\":\"0\",\"aux_brakes\":\"0\",\"brake_boost\":\"0\",\"scs\":\"0\",\"traction\":\"0\"},\"elev\":\"384\",\"heading\":\"6160\",\"id\":\"11111111\",\"lat\":\"38.9549740\",\"long\":\"-77.1476267\",\"msg_count\":\"70\",\"sec_mark\":\"40328\",\"size\":{\"length\":\"500\",\"width\":\"200\"},\"speed\":\"282\",\"transmission\":\"0\"}}";
        String json_str = "{ \"metadata\":" + json_metadata_str + ",\"payload\":" + BSM_json_payload_str + "}";
        String flattened_json_str = helper.flattenJsonStr(json_str);
        JSONParser parser = new JSONParser();
        try {
            JSONObject flattened_json = (JSONObject) parser.parse(flattened_json_str);
            assertEquals("BlackPacifica", flattened_json.get("metadata.unit_name"));
            assertEquals("384", flattened_json.get("payload.core_data.elev"));
            assertEquals("282", flattened_json.get("payload.core_data.speed"));
            assertEquals("38.9549740", flattened_json.get("payload.core_data.lat"));
            assertEquals("-77.1476267", flattened_json.get("payload.core_data.long"));
            assertEquals("Integration", flattened_json.get("metadata.testing_type"));
        } catch (ParseException e) {
            e.printStackTrace();
        }

        String mo_json_str = "{\"payload\":{\"metadata\":{\"hostBSMId\":\"bb906b4e\",\"hostStaticId\":\"DOT-45244\",\"planId\":\"a95fe925-1c09-43eb-b40e-5abe7611b187\",\"targetStaticId\":\"UNSET\",\"timestamp\":\"0000001681146252589\"},\"trajectory\":{\"location\":{\"ecefX\":110457775,\"ecefY\":-484207718,\"ecefZ\":398843563,\"timestamp\":\"0000000000000000000\"},\"offsets\":[{\"offsetX\":51,\"offsetY\":-3,\"offsetZ\":-18},{\"offsetX\":96,\"offsetY\":-1,\"offsetZ\":-28},{\"offsetX\":96,\"offsetY\":-2,\"offsetZ\":-29},{\"offsetX\":96,\"offsetY\":-2,\"offsetZ\":-28},{\"offsetX\":96,\"offsetY\":-1,\"offsetZ\":-28},{\"offsetX\":96,\"offsetY\":-2,\"offsetZ\":-29},{\"offsetX\":96,\"offsetY\":-1,\"offsetZ\":-28},{\"offsetX\":96,\"offsetY\":-2,\"offsetZ\":-29},{\"offsetX\":97,\"offsetY\":-1,\"offsetZ\":-28},{\"offsetX\":96,\"offsetY\":-2,\"offsetZ\":-28},{\"offsetX\":96,\"offsetY\":0,\"offsetZ\":-27},{\"offsetX\":97,\"offsetY\":-1,\"offsetZ\":-27},{\"offsetX\":96,\"offsetY\":1,\"offsetZ\":-26},{\"offsetX\":97,\"offsetY\":1,\"offsetZ\":-26},{\"offsetX\":97,\"offsetY\":1,\"offsetZ\":-25},{\"offsetX\":98,\"offsetY\":2,\"offsetZ\":-24},{\"offsetX\":97,\"offsetY\":3,\"offsetZ\":-24},{\"offsetX\":97,\"offsetY\":3,\"offsetZ\":-23},{\"offsetX\":98,\"offsetY\":3,\"offsetZ\":-22},{\"offsetX\":98,\"offsetY\":5,\"offsetZ\":-22},{\"offsetX\":97,\"offsetY\":4,\"offsetZ\":-21},{\"offsetX\":77,\"offsetY\":4,\"offsetZ\":-16},{\"offsetX\":100,\"offsetY\":6,\"offsetZ\":-21},{\"offsetX\":100,\"offsetY\":7,\"offsetZ\":-20},{\"offsetX\":100,\"offsetY\":6,\"offsetZ\":-19},{\"offsetX\":100,\"offsetY\":8,\"offsetZ\":-18},{\"offsetX\":100,\"offsetY\":8,\"offsetZ\":-18},{\"offsetX\":100,\"offsetY\":9,\"offsetZ\":-17},{\"offsetX\":100,\"offsetY\":9,\"offsetZ\":-16},{\"offsetX\":101,\"offsetY\":10,\"offsetZ\":-16},{\"offsetX\":100,\"offsetY\":10,\"offsetZ\":-15},{\"offsetX\":100,\"offsetY\":10,\"offsetZ\":-16},{\"offsetX\":101,\"offsetY\":11,\"offsetZ\":-14},{\"offsetX\":100,\"offsetY\":11,\"offsetZ\":-15},{\"offsetX\":100,\"offsetY\":11,\"offsetZ\":-15},{\"offsetX\":101,\"offsetY\":10,\"offsetZ\":-14},{\"offsetX\":100,\"offsetY\":11,\"offsetZ\":-14},{\"offsetX\":100,\"offsetY\":12,\"offsetZ\":-15},{\"offsetX\":101,\"offsetY\":11,\"offsetZ\":-14},{\"offsetX\":100,\"offsetY\":11,\"offsetZ\":-14},{\"offsetX\":100,\"offsetY\":12,\"offsetZ\":-14},{\"offsetX\":101,\"offsetY\":11,\"offsetZ\":-13},{\"offsetX\":100,\"offsetY\":12,\"offsetZ\":-14},{\"offsetX\":101,\"offsetY\":11,\"offsetZ\":-13}]}},\"unit_id\":\"kafka_id\",\"unit_type\":\"infrastructure\",\"unit_name\":\"WestIntersection\",\"msg_type\":\"v2xhub_mobility_path_in\",\"event_name\":\"WFD_Verification_2\",\"testing_type\":\"Verification\",\"location\":\"TFHRC\",\"topic_name\":\"v2xhub_mobility_path_in\",\"timestamp\":1681146252589000}";
        String flattened_mo_json_str = helper.flattenJsonStr(mo_json_str);
        try {
            JSONObject flattened_json = (JSONObject) parser.parse(flattened_mo_json_str);
            assertEquals("bb906b4e", flattened_json.get("payload.metadata.hostBSMId"));
        } catch (ParseException e) {
            e.printStackTrace();
        }

        String tcr_json_str = "{\"payload\":{\"TrafficControlRequest\":{\"@port\":\"22222\",\"@list\":\"true\",\"reqid\":\"4947918446524149\",\"reqseq\":\"0\",\"scale\":\"-1\",\"bounds\":{\"oldest\":\"28000218\",\"reflon\":\"-771510185\",\"reflat\":\"389543898\",\"offsets\":[{\"deltax\":\"3232\",\"deltay\":\"0\"},{\"deltax\":\"3232\",\"deltay\":\"1577\"},{\"deltax\":\"0\",\"deltay\":\"1577\"}]}}},\"unit_id\":\"cloud_id\",\"unit_type\":\"infrastructure\",\"unit_name\":\"DevCC\",\"msg_type\":\"TCR\",\"event_name\":\"WFD_Verification_2\",\"testing_type\":\"Verification\",\"location\":\"TFHRC\",\"topic_name\":\"TCR\",\"timestamp\":1681309089575201.0,\"log_timestamp\":1681309089425000.0}";
        String flattened_tcr_json_str = helper.flattenJsonStr(tcr_json_str);
        try {
            JSONObject flattened_json = (JSONObject) parser.parse(flattened_tcr_json_str);
            assertEquals("4947918446524149", flattened_json.get("payload.TrafficControlRequest.reqid"));
        } catch (ParseException e) {
            e.printStackTrace();
        }

        String tcm_json_str ="{\"payload\":{\"TrafficControlMessage\":{\"tcmV01\":{\"reqid\":\"4947918446524142\",\"reqseq\":\"0\",\"msgtot\":\"1\",\"msgnum\":\"1\",\"id\":\"007d1d1c5ea3f134ab2e9d868a033372\",\"updated\":\"0\",\"params\":{\"vclasses\":{\"micromobile\":\"None\",\"motorcycle\":\"None\",\"passenger-car\":\"None\",\"light-truck-van\":\"None\",\"bus\":\"None\",\"two-axle-six-tire-single-unit-truck\":\"None\",\"three-axle-single-unit-truck\":\"None\",\"four-or-more-axle-single-unit-truck\":\"None\",\"four-or-fewer-axle-single-trailer-truck\":\"None\",\"five-axle-single-trailer-truck\":\"None\",\"six-or-more-axle-single-trailer-truck\":\"None\",\"five-or-fewer-axle-multi-trailer-truck\":\"None\",\"six-axle-multi-trailer-truck\":\"None\",\"seven-or-more-axle-multi-trailer-truck\":\"None\"},\"schedule\":{\"start\":\"28004757\",\"end\":\"153722867280912\",\"dow\":\"1111111\"},\"regulatory\":{\"true\":\"None\"},\"detail\":{\"maxspeed\":\"45\"}},\"geometry\":{\"proj\":\"epsg:3785\",\"datum\":\"WGS84\",\"reftime\":\"28004757\",\"reflon\":\"-771490031\",\"reflat\":\"389549140\",\"refelv\":\"0\",\"refwidth\":\"405\",\"heading\":\"3312\"}}}}}";
        String flattened_tcm_json_str = helper.flattenJsonStr(tcm_json_str);
        System.out.println(flattened_tcm_json_str);
        try {
            JSONObject flattened_json = (JSONObject) parser.parse(flattened_tcm_json_str);
            assertEquals("4947918446524142", flattened_json.get("payload.TrafficControlMessage.tcmV01.reqid"));
        } catch (ParseException e) {
            e.printStackTrace();
        }

        String nan_json_metadata_str = "{\"unit_name\":\"BlackPacifica\",\"event_name\":\"UC3\",\"location\":\"TFHRC\",\"unit_type\":\"Platform\",\"unit_id\":\"DOT-508\",\"testing_type\":\"Integration\"}";
        String nan_BSM_json_payload_str = "{\"core_data\":{\"accel_set\":{\"lat\":\"2\",\"long\":\"-79\",\"vert\":\"-127\",\"yaw\":\"12\"},\"accuracy\":{\"orientation\":\"65535\",\"semi_major\":\"255\",\"semi_minor\":\"255\"},\"angle\":\"127\",\"brakes\":{\"abs\":\"NaN\",\"aux_brakes\":\"0\",\"brake_boost\":\"0\",\"scs\":\"0\",\"traction\":\"0\"},\"elev\":\"384\",\"heading\":\"6160\",\"id\":\"11111111\",\"lat\":\"38.9549740\",\"long\":\"-77.1476267\",\"msg_count\":\"70\",\"sec_mark\":\"40328\",\"size\":{\"length\":\"500\",\"width\":\"200\"},\"speed\":\"282\",\"transmission\":\"0\"}}";
        String nan_json_str = "{ \"metadata\":" + nan_json_metadata_str + ",\"payload\":" + nan_BSM_json_payload_str + "}";
        String nan_flattened_json_str = helper.flattenJsonStr(nan_json_str);
        try {
            JSONObject flattened_json = (JSONObject) parser.parse(nan_flattened_json_str);
            assertEquals("NaN", flattened_json.get("payload.core_data.brakes.abs"));
        } catch (ParseException e) {
            e.printStackTrace();
        }
    }
}
