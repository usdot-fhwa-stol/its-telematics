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
const { events, Sequelize, locations, testing_types, units, event_units } = require("../models");

/**
 *@brief Assign a unit to an event.
 * @Params The unit and event information combination
 * @Return Response status and message
 */
exports.create = (req, res) => {
  if (!req.body) {
    res.status(400).send({
      message: "Content cannot be empty."
    });
    return;
  }

  var event_unit = req.body.event_unit;
  event_unit.end_time = new Date(event_unit.end_time);
  event_unit.start_time = new Date(event_unit.start_time);
  //create an event_unit
  return events.findByPk(event_unit.eventId)
    .then((event) => {
      if (!event) {
        console.log("event not found!");
        return null;
      }
      return units.findByPk(event_unit.unitId).then((unit) => {
        if (!unit) {
          console.log("unit not found!");
          return null;
        }
        unit.event_units={
          start_time: event_unit.start_time, end_time: event_unit.end_time
        }
        event.addUnits(unit);
        res.status(200).send(event);
        return event;
      });
    })
    .catch((err) => {
      console.error(">> Error while adding unit to event: ", err);
    });
}


/**
 *@brief Remove a unit from an event.
 * @Params The unit and event information combination
 * @Return Response status and message
 */
exports.delete = (req, res) => {
  const event_id = req.query.event_id;
  const unit_id = req.query.unit_id;
  if (event_id === undefined || unit_id === undefined) {
    res.status(404).send({ message: `Cannot delete event unit id =${unit_id}. Maybe event unit was not found or request body was empty.` });
    return;
  }
  event_units.destroy({
    where: { unitId: unit_id, eventId: event_id }
  }).then(num => {
    if (num == 1) {
      res.status(200).send({ message: "Event unit was deleted successfully." })
    } else {
      res.status(404).send({ message: `Cannot delete event unit id =${unit_id}. Maybe event unit was not found or request body was empty.` });
    }
  }).catch(err => {
    res.status(500).send({ message: `Error deleting event unit with id =${unit_id}` })
  });

};