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
export const INVALID_LOCATION_ID = 0;
export const INVALID_EVENT_ID = 0;
export const INVALID_TESTING_TYPE_ID = 0;

export const INVALID_LOCATION_ID_STR = '';
export const INVALID_EVENT_ID_STR = '';
export const INVALID_TESTING_TYPE_ID_STR = '';
export const INVALID_EVENT_NAME_ID_STR = '';


export const DEFAULT_NA = 'N/A';
export const PAST_EVENT = "Past";
export const LIVE_EVENT = "Live";
export const ACTIVE_EVENT = "Active";
export const UNKNOWN_EVENT = "Unknown";
export const UNKNOWN_DATE = "Unknown";

export const VALID_UNIT_TYPES = {
    ROS2_VEHICLE: "ros2",
    KAFKA_INFRASTRUCTURE: "kafka",
    V2XHUB_INFRASTRUCTURE: "V2xHub",
    CLOUD_INFRASTRUCTURE: "Cloud"
}