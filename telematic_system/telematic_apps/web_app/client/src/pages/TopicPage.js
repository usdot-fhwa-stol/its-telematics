/*
 * Copyright (C) 2019-2024 LEIDOS.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
import StreamIcon from '@mui/icons-material/Stream';
import { FormControl, Grid } from '@mui/material';
import React, { useContext, useEffect, useState } from 'react';
import { findAllEvents } from '../api/api-events';
import { findAllLocations } from '../api/api-locations';
import { findAllTestingTypes } from '../api/api-testing-types';
import { requestSelectedLiveUnitsTopics } from '../api/api-topics';
import { findUsersTopicRequestByEventUnits, upsertUserTopicRequestForEventUnits } from '../api/user-topic-request';
import { VALID_UNIT_TYPES } from '../components/events/EventMetadata';
import InfrastructureTopicList from '../components/topics/InfrastructureTopicList';
import { NOTIFICATION_STATUS } from '../components/topics/TopicMetadata';
import TopicsFilter from '../components/topics/TopicsFilter';
import VehicleTopicList from '../components/topics/VehicleTopicList';
import { CustomizedButton } from '../components/ui/CustomizedButton';
import Notification from '../components/ui/Notification';
import { PageAvatar } from '../components/ui/PageAvatar';
import { USER_ROLES } from '../components/users/UserMetadata';
import AuthContext from '../context/auth-context';
import TopicContext from '../context/topic-context';

const TopicPage = React.memo(() => {
  const authCtx = React.useContext(AuthContext)
  const TopicCtx = useContext(TopicContext);
  //Add Alert notification
  const [alertStatus, setAlertStatus] = useState({});
  const closeAlertHandler = () => {
    setAlertStatus({
      open: false,
      severity: NOTIFICATION_STATUS.SUCCESS,
      title: '',
      message: ''
    });
  }
  const [eventInfoList, setEventInfoList] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [infrastructures, setInfrastructures] = useState([]);
  const [testingTypeList, setTestingTypeList] = useState([]);
  const [locationList, setLocationList] = useState([]);
  const [eventId, setEventId] = useState([]);

  //Filter Events
  const onSelectEventsHandler = (filteredEventList) => {
    //Assuming that allowing to select one event from the dropdown at a time
    if (filteredEventList.length !== 0) {
      let filteredEvent = filteredEventList[0];
      const units = filteredEvent.units !== undefined ? filteredEvent.units : [];
      if (units.length > 0) {
        setEventId(filteredEvent.id);
        let filteredVehicles = [];
        let filteredInfrastructures = [];
        units.forEach(element => {
          element.event_id = filteredEvent.id;
          element.event_name = filteredEvent.name;
          if (element.unit_type !== undefined &&
            element.unit_type.toLocaleLowerCase() === VALID_UNIT_TYPES.ROS2_VEHICLE.toLocaleLowerCase()) {
            filteredVehicles = [...filteredVehicles, element];
          } else if (element.unit_type !== undefined &&
            (element.unit_type.toLocaleLowerCase() === VALID_UNIT_TYPES.CLOUD_INFRASTRUCTURE.toLocaleLowerCase()
              || element.unit_type.toLocaleLowerCase() === VALID_UNIT_TYPES.KAFKA_INFRASTRUCTURE.toLocaleLowerCase()
              || element.unit_type.toLocaleLowerCase() === VALID_UNIT_TYPES.V2XHUB_INFRASTRUCTURE.toLocaleLowerCase())) {
            filteredInfrastructures = [...filteredInfrastructures, element];
            console.log(element.unit_type);
          }
          else {
            console.error("Invalid unit type in units for event = ", filteredEvent.name);
          }
        });
        setVehicles(filteredVehicles);
        setInfrastructures(filteredInfrastructures);
      }

      //clear TopicContext for all seleted event and unit topics
      TopicCtx.clear();
    }
  }


  //Send topic request to the server
  const confirmSelectedTopicHandler = () => {
    const seletedUnitTopicListToConfirm = TopicCtx.selected_unit_topics_list;
    console.log(seletedUnitTopicListToConfirm)
    var isClear = false;
    if (seletedUnitTopicListToConfirm.length === 0) {
      isClear = true;
      for (let vehicle of vehicles) {
        let clearUnits = { unit_identifier: vehicle.unit_identifier, unit_name: vehicle.unit_name, event_id: vehicle.event_id };
        seletedUnitTopicListToConfirm.push(clearUnits);
      }
      for (let infrastructure of infrastructures) {
        let clearUnits = { unit_identifier: infrastructure.unit_identifier, unit_name: infrastructure.unit_name, event_id: infrastructure.event_id };
        seletedUnitTopicListToConfirm.push(clearUnits);
      }
    }
    //Update current user topic request
    updateUserTopicRequest(seletedUnitTopicListToConfirm);

    let unit_identifiers = [];
    let event_id = 0;
    //Find unit identifiers for the confirming topics request
    seletedUnitTopicListToConfirm.forEach(item => {
      unit_identifiers.push(item.unit_identifier);
      event_id = item.event_id;
    });

    //Find all existing users's topic request except current user topic request before sending the current user's topic request
    findUsersTopicRequestByEventUnits(event_id, unit_identifiers, authCtx.user_id).then(data => {
      let updatedSeletedUnitTopicListToConfirm = [];
      if (data !== undefined
        && Array.isArray(data)
        && seletedUnitTopicListToConfirm !== undefined
        && Array.isArray(seletedUnitTopicListToConfirm)) {
        seletedUnitTopicListToConfirm.forEach(item => {
          let updatedTopicRequestConfirmation = {};
          updatedTopicRequestConfirmation = {
            event_id: item.event_id,
            unit_identifier: item.unit_identifier,
            unit_name: item.unit_name,
            unit_topics: [{ category: "Default", topics: [] }],
            unit_type: item.unit_type,
          }

          //Find current selected unit topic names from the selected confirmation list
          let curSelectedUnitTopicNames = [];
          if (item.unit_topics !== undefined && Array.isArray(item.unit_topics) && item.unit_topics.length > 0) {
            item.unit_topics.forEach(unit_topic => {
              unit_topic.topics.forEach(topic => {
                curSelectedUnitTopicNames.push(topic.name);
                updatedTopicRequestConfirmation.unit_topics[0].topics.push({ name: topic.name });
              });
            });
          }
          //Loop through existing all users' topic request
          data.forEach(dataItem => {
            //Check the same unit for current user topics request and all users' topics request
            if (dataItem.unit_identifier === updatedTopicRequestConfirmation.unit_identifier) {
              dataItem.topic_names.split(",").forEach(topic_name => {
                //Check if the all users' topics request topic names in the current users' topic request topic name,
                // if not in the current user request, update the current topic request
                if (!curSelectedUnitTopicNames.includes(topic_name)
                  && topic_name.length > 0) {
                  updatedTopicRequestConfirmation.unit_topics[0].topics.push({ name: topic_name });
                }
              })
            }
          });

          //Update the confirm topic request
          updatedSeletedUnitTopicListToConfirm.push(updatedTopicRequestConfirmation);
        })
      }

      //Send topic request to telematic unit
      const response_data = requestSelectedLiveUnitsTopics(updatedSeletedUnitTopicListToConfirm);
      let messageList = [];
      let num_failed = 0;
      let num_success = 0;
      response_data.then(allResponses => {
        if (allResponses !== undefined && Array.isArray(allResponses)) {
          allResponses.forEach(items => {
            if (Array.isArray(items) && items !== undefined) {
              items.forEach(item => {
                if (item.data !== undefined && !messageList.includes(item.data)) {
                  messageList.push(item.data);
                  num_success += 1;
                } else if (item.errCode !== undefined && !messageList.includes(item.errMsg)) {
                  messageList.push(item.errMsg);
                  num_failed += 1;
                }
              })
            }
          });
        }
        if(num_failed === 0 && num_success === 0)
        {
            messageList.push("Failed to send request. Please click the confirm selected topics button again.")
        }
        //Notification
        let severity = num_failed === 0 && num_success === 0 ? NOTIFICATION_STATUS.ERROR : (num_failed === 0 && num_success !== 0 ? NOTIFICATION_STATUS.SUCCESS: (num_failed !==0 && num_success===0? NOTIFICATION_STATUS.ERROR : NOTIFICATION_STATUS.WARNING));
        setAlertStatus({
          open: true,
          severity: severity,
          title: severity,
          messageList: messageList
        });

        //Clear the topic context for all units if no selected topics from those units
        if (isClear) {
          TopicCtx.clear();
        }
      });
    }).catch(error => {
      console.error(error);
    })

  }

  const updateUserTopicRequest = (seletedUnitTopicListToConfirm) => {
    if (authCtx.user_id === undefined) {
      console.error("User topic request failed due to user id is undefined!");
      return;
    }
    let response_data = upsertUserTopicRequestForEventUnits(seletedUnitTopicListToConfirm, authCtx.user_id);
    response_data.then(json => {
      if (json !== undefined && Array.isArray(json)) {
        json.forEach(item => {
          if (item.data !== undefined) {
            console.log("Successfully save user topic request!");
          } else if (item.errCode !== undefined) {
            console.error("Failed to save user topic request!");
          }
        });
      }
    })
  }

  useEffect(() => {
    const res_loc_data = findAllLocations();
    res_loc_data.then(json => {
      if (json !== undefined) {
        let locs = [];
        json.forEach(loc => {
          locs.push(loc);
        });
        setLocationList(locs);
      }
    });

    const res_event_data = findAllEvents({});
    res_event_data.then(json => {
      if (json !== undefined) {
        let events = [];
        json.forEach(event => {
          events.push(event);
        });
        setEventInfoList(events);
      }
    });

    const res_testing_types_data = findAllTestingTypes({});
    res_testing_types_data.then((json) => {
      if (json !== undefined) {
        let testing_types = [];
        json.forEach((tt) => {
          testing_types.push(tt);
        });
        setTestingTypeList(testing_types);
      }
    });
  }, []);

  return (
    <React.Fragment>
      <Notification open={alertStatus.open}
        closeAlert={closeAlertHandler}
        severity={alertStatus.severity}
        title={alertStatus.title}
        messageList={alertStatus.messageList} />
      {
        authCtx.role !== undefined && authCtx.role !== null && authCtx.role !== "" &&
        <Grid container columnSpacing={2} rowSpacing={1}>
          <PageAvatar icon={<StreamIcon />} title="Topic Management" />
          <Grid item xs={4}></Grid>
          <TopicsFilter eventInfoList={eventInfoList} onSelectEvents={onSelectEventsHandler} testingTypeList={testingTypeList} locationList={locationList} />
          <VehicleTopicList availableUnits={vehicles} event_id={eventId} />
          <InfrastructureTopicList availableUnits={infrastructures} event_id={eventId} />
          {
            authCtx.role !== USER_ROLES.VIEWER && authCtx.role !== undefined && authCtx.role !== null && authCtx.role !== "" &&
            <Grid item xs={12} sx={{ textAlign: 'center' }}>
              <FormControl>
                <CustomizedButton title="Send a request with a list of selected topics, and request telematic server to stream data for the selected topics."
                 onClick={confirmSelectedTopicHandler}>
                    Confirm Selected Topics
                </CustomizedButton>
              </FormControl>
            </Grid>
          }
        </Grid>
      }
    </React.Fragment>
  )
});

export default TopicPage