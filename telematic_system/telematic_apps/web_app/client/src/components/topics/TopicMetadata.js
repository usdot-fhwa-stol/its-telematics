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
export const DUMMY_units =
[
  {
    unit_identifier: 'DOT-12',
    unit_type: "ros2",
    unit_name: "Black Pacifica",
    unit_topics: [{
      category: 'sample 1',
      topics: [{
        name: 'sample_topic_1'
      }],
    },
    {
      category: 'sample 2',
      topics: [{
        name: 'sample_topic_3'
      }, {
        name: 'sample_topic_2'
      }],
    }]
  },
  {
    unit_identifier: 'DOT-13',
    unit_type: "ros2",
    unit_name: "White Pacifica",
    unit_topics: [{
      category: 'sample 1',
      topics: [{
        name: 'sample_topic_1'
      }],
    },
    {
      category: 'sample 2',
      topics: [{
        name: 'sample_topic_2'
      }],
    }]
  },
  {
    unit_identifier: 'streets_id',
    unit_type: "Infrastructure",
    unit_name: "West Intersection",
    unit_topics: [{
      category: 'sample 1',
      topics: [{
        name: 'sample_topic_1'
      }],
    },
    {
      category: 'sample 2',
      topics: [{
        name: 'sample_topic_2'
      }],
    }]
  }
];

export const DEFAULT_TOPIC_CATEGORY_NAME="Default";

export const NOTIFICATION_STATUS={
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
}