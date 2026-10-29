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
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Collapse, IconButton, Typography } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { Box } from '@mui/system';
import * as React from 'react';
import AuthContext from '../../context/auth-context';
import { USER_ROLES } from '../users/UserMetadata';
import { ACTIVE_EVENT, DEFAULT_NA, INVALID_LOCATION_ID, INVALID_LOCATION_ID_STR, INVALID_TESTING_TYPE_ID, INVALID_TESTING_TYPE_ID_STR, LIVE_EVENT, PAST_EVENT, UNKNOWN_DATE, UNKNOWN_EVENT } from './EventMetadata';
import EventTableControlsItem from './EventTableControlsItem';
import EventTableItemPopover from './EventTableItemPopover';
import EventTableRowCollapseDialog from './EventTableRowCollapseDialog';

const EventTableRowCollapse = (props) => {
    const authCtx = React.useContext(AuthContext)
    //Collapse Open/close
    const [open, setOpen] = React.useState(false);
    const onConfirmUnassignUnitHandler = (event_unit) => {
        props.onConfirmUnassignUnitHandler(event_unit);
    }
    return (
        <React.Fragment>
            <TableRow hover role="checkbox" tabIndex={-1} key={props.eventRow.id}>
                <TableCell key={`${props.eventRow.id}-expand-icon`}>
                    <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => setOpen(!open)}>
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                {
                    props.columns.map((column) => {
                        let value = props.eventRow[column.id];
                        if (column.id === "end_at" || column.id === "start_at") {
                            const datetime = new Date(value);
                            value = datetime.toLocaleString();
                        }

                        if (column.id === "testing_type") {
                            value = (value === undefined || value.name === undefined || value.id === INVALID_TESTING_TYPE_ID
                                || value.id === INVALID_TESTING_TYPE_ID_STR) ? DEFAULT_NA : value.name
                        }

                        if (column.id === "location") {
                            value = (value === undefined || value.facility_name === undefined ||
                                value.id === INVALID_LOCATION_ID || value.id === INVALID_LOCATION_ID_STR) ? DEFAULT_NA : value.facility_name + " ," + value.city + " ," + value.state_code + " " + value.zip_code
                        }

                        if (column.id === "status") {
                            if (value !== undefined && value.length > 0 && value.toLowerCase() === LIVE_EVENT.toLowerCase()) {
                                value = LIVE_EVENT;
                            } else {
                                const start_ts = new Date(props.eventRow['start_at']).getTime();
                                const end_ts = new Date(props.eventRow['end_at']).getTime();
                                if (new Date().getTime() <= end_ts) {
                                    value = ACTIVE_EVENT;
                                } else if (new Date().getTime() > end_ts || new Date().getTime() < start_ts) {
                                    value = PAST_EVENT;
                                } else {
                                    value = UNKNOWN_EVENT;
                                }
                            }
                        }
                        return (
                            <TableCell sx={{
                                color: value.toLowerCase() === LIVE_EVENT.toLowerCase() ? "#33bfff" : "",
                                fontWeight: value.toLowerCase() === LIVE_EVENT.toLowerCase() ? "bolder" : ""
                            }}
                                key={`event-row-${props.eventRow.id}-${column.id}`} align={column.align}>
                                {value}

                                {
                                    column.id === "name" && props.eventRow.description !== '' &&
                                    <EventTableItemPopover info={props.eventRow.description} />
                                }
                            </TableCell>
                        );
                    })
                }
                <EventTableControlsItem eventRow={props.eventRow} unitList={props.unitList} locationList={props.locationList} testingTypeList={props.testingTypeList} onEventSaveHandler={props.onEventSaveHandler} onDeleteEvent={props.onDeleteEvent} onAssignUnitHandler={props.onAssignUnitHandler} />
            </TableRow>

            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                            <Typography variant="inherit" sx={{ fontWeight: 'bolder' }} gutterBottom component="div">
                                Unit Assignment History
                            </Typography>
                            <Table size="small" aria-label="purchases">
                                <TableHead >
                                    <TableRow >
                                        <TableCell sx={{ fontWeight: 'bolder' }} key={`Unit-name`}>Unit Name</TableCell>
                                        <TableCell sx={{ fontWeight: 'bolder' }} key={`Unit-type`}>Unit Type</TableCell>
                                        <TableCell sx={{ fontWeight: 'bolder' }} key={`Unit-start-date`}>Start Time & Date</TableCell>
                                        <TableCell sx={{ fontWeight: 'bolder' }} key={`Unit-end-date`}>End Time & Date</TableCell>
                                        {
                                            authCtx.role !== USER_ROLES.VIEWER && authCtx.role !== undefined && authCtx.role !== null && authCtx.role !== "" &&
                                            <TableCell sx={{ fontWeight: 'bolder' }} key={`Unit-controls`}>Controls</TableCell>
                                        }
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {
                                        props.eventRow.units !== undefined &&
                                        props.eventRow.units.length !== 0 &&
                                        props.eventRow.units.map((unit) => (
                                            <TableRow key={`Unit-row-${unit.unit_identifier}`}>
                                                <TableCell component="th" scope="row" key={`${props.eventRow.id}-Unit-name-${unit.unit_identifier}`}>
                                                    {unit.unit_name} ({unit.unit_identifier} )
                                                </TableCell>
                                                <TableCell component="th" scope="row" key={`${props.eventRow.id}-Unit-type-${unit.unit_type}-${Math.random() * 100}`}>
                                                    {unit.unit_type}
                                                </TableCell>
                                                {props.eventRow.event_units !== undefined &&
                                                    <React.Fragment>
                                                        <TableCell key={`${props.eventRow.id}-Unit-${unit.unit_identifier}-start-${props.eventRow.event_units.filter(event_unit => event_unit.unitId === unit.id)[0].start_time}`}>
                                                            {new Date(props.eventRow.event_units.filter(event_unit => event_unit.unitId === unit.id)[0].start_time).toLocaleString()}
                                                        </TableCell>
                                                        <TableCell key={`${props.eventRow.id}-Unit-${unit.unit_identifier}-end-${props.eventRow.event_units.filter(event_unit => event_unit.unitId === unit.id)[0].end_time}`}>
                                                            {new Date(props.eventRow.event_units.filter(event_unit => event_unit.unitId === unit.id)[0].end_time).toLocaleString()}
                                                        </TableCell>
                                                    </React.Fragment>
                                                }

                                                {props.eventRow.event_units === undefined &&
                                                    <React.Fragment>
                                                        <TableCell key={`${props.eventRow.id}-Unit-${unit.unit_identifier}-start`}>
                                                            {UNKNOWN_DATE}
                                                        </TableCell>
                                                        <TableCell key={`${props.eventRow.id}-Unit-${unit.unit_identifier}-end`}>
                                                            {UNKNOWN_DATE}
                                                        </TableCell>
                                                    </React.Fragment>
                                                }
                                                {
                                                    authCtx.role !== USER_ROLES.VIEWER && authCtx.role !== undefined && authCtx.role !== null && authCtx.role !== "" &&
                                                    <EventTableRowCollapseDialog unit={unit} eventRow={props.eventRow} key={`${props.eventRow.id}-Unit-name-${unit.unit_identifier}-dialog`} onConfirmUnassignUnitHandler={onConfirmUnassignUnitHandler} />
                                                }
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    )
}

export default EventTableRowCollapse