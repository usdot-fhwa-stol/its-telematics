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
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EventIcon from '@mui/icons-material/Event';
import LogoutIcon from '@mui/icons-material/Logout';
import StreamIcon from '@mui/icons-material/Stream';
import SettingsInputAntennaIcon from '@mui/icons-material/SettingsInputAntenna';
import WorkHistorySharpIcon from '@mui/icons-material/WorkHistorySharp';
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Tooltip } from '@mui/material';
import MuiDrawer from '@mui/material/Drawer';
import { styled } from '@mui/material/styles';
import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getUserRole } from '../../api/api-org';
import { checkServerSession, deleteUser } from '../../api/api-user';
import AuthContext from '../../context/auth-context';
import { USER_ROLES } from '../users/UserMetadata';
import { withStyles } from '@mui/styles';

const NavMenu = React.memo(() => {
    const authCtx = React.useContext(AuthContext);
    useEffect(() => {
        //update user role if changed
        if (authCtx.user_id !== null && authCtx.user_id !== undefined && authCtx.org_id !== null
            && authCtx.org_id !== undefined && parseInt(authCtx.org_id) !== 0 && authCtx.sessionToken !== null) {
            //Update headers with auth token            
            checkServerSession(authCtx.sessionToken);
            getUserRole({
                user_id: parseInt(authCtx.user_id),
                org_id: parseInt(authCtx.org_id)
            }).then(data => {
                if (data !== undefined && data.errCode === undefined && Array.isArray(data) && data.length > 0) {
                    if (data[0].role !== undefined && data[0].role.length > 0 && data[0].role !== authCtx) {
                        authCtx.updateRole(data[0].role);
                    }
                }
                //If the user current role is empty, update user session role to empty
                else if (data !== undefined && data.errCode === undefined && Array.isArray(data) && data.length === 0) {
                    authCtx.updateRole("");
                }
            });
        }
    })

    const location = useLocation();
    const logoutHandler = React.useCallback(() => {
        deleteUser(authCtx.username).then(status => {
            authCtx.logout();
        }).catch(error => {
            console.log("error logout: " + error);
        });
    }, [authCtx]);

    const closedMixin = (theme) => ({
        transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
        overflowX: 'hidden',
        width: `calc(${theme.spacing(7)} + 1px)`,
        [theme.breakpoints.up('sm')]: {
            width: `calc(${theme.spacing(8)} + 1px)`,
        },
    });

    const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
        ({ theme, open }) => ({
            ...(!open && {
                ...closedMixin(theme),
                '& .MuiDrawer-paper': closedMixin(theme),
            }),
        }),
    );
    const StyledListItemButton = withStyles({
        root: {
            backgroundColor: "#ffffff",
            "&.Mui-selected": {
                backgroundColor: "#748c93"
            },
            "&.Mui-selected:hover": {
                backgroundColor: "#748c93"
            }
        },
    })(ListItemButton)

    return (
        <React.Fragment>
            <Drawer variant="permanent" open={false}>
                <Toolbar />
                <Toolbar />
                <List >
                    { location.pathname.includes("/telematic") && 
                    <ListItem key="Events" disablePadding sx={{ display: 'block' }}>
                        <StyledListItemButton
                            component={Link} to="/telematic/events"
                            selected={"/telematic/events" === location.pathname}>
                            <Tooltip title="Events" placement="right-start" arrow>
                                <ListItemIcon>
                                    <EventIcon />
                                </ListItemIcon>
                            </Tooltip>
                            <ListItemText primary="Events" />
                        </StyledListItemButton>
                    </ListItem>
                    }
                    { location.pathname.includes("/telematic") && 
                    <ListItem key="Topics" disablePadding sx={{ display: 'block' }}>
                        <StyledListItemButton
                            component={Link} to="/telematic/topics"
                            selected={"/telematic/topics" === location.pathname}>
                            <Tooltip title="Topics" placement="right-start" arrow>
                                <ListItemIcon>
                                    <StreamIcon />
                                </ListItemIcon>
                            </Tooltip>
                            <ListItemText primary="Topics" />
                        </StyledListItemButton>
                    </ListItem>
                    }
                    { location.pathname.includes("/telematic") && 
                    <ListItem key="RSU Management" disablePadding sx={{ display: 'block' }}>
                        <StyledListItemButton
                            component={Link} to="/telematic/rsu-management"
                            selected={"/telematic/rsu-management" === location.pathname}>
                            <Tooltip title="RSU Management" placement="right-start" arrow>
                                <ListItemIcon>
                                    <SettingsInputAntennaIcon />
                                </ListItemIcon>
                            </Tooltip>
                            <ListItemText primary="RSU Management" />
                        </StyledListItemButton>
                    </ListItem>
                    }
                    {
                        (location.pathname.includes("/telematic") && ( parseInt(authCtx.is_admin) === 1 ||  authCtx.role === USER_ROLES.ADMIN)) &&
                        <ListItem key="admin" disablePadding sx={{ display: 'block' }}>
                            <StyledListItemButton
                                component={Link} to="/telematic/admin"
                                selected={"/telematic/admin" === location.pathname}>
                                <Tooltip title="Administrators" placement="right-start" arrow>
                                    <ListItemIcon>
                                        <AdminPanelSettingsIcon />
                                    </ListItemIcon>
                                </Tooltip>
                                <ListItemText primary="Topics" />
                            </StyledListItemButton>
                        </ListItem>
                    }
                    { location.pathname.includes("/historical/data") && 
                    <ListItem key="ROS2rosbag" disablePadding sx={{ display: 'block' }}>
                        <StyledListItemButton
                            component={Link} to="/historical/data/ros2/rosbag"
                            selected={"/historical/data/ros2/rosbag" === location.pathname}>
                            <Tooltip title="ROS2 rosbag" placement="right-start" arrow>
                                <ListItemIcon>
                                    <WorkHistorySharpIcon />
                                </ListItemIcon>
                            </Tooltip>
                            <ListItemText primary="ROS2 rosbag" />
                        </StyledListItemButton>
                    </ListItem>
                    }
                </List>
                <StyledListItemButton title="Logout" onClick={logoutHandler} sx={{
                    position: "absolute",
                    bottom: 20,
                    right: 0,
                    left: 0,
                    width: "fit-content"
                }}>
                    <Tooltip title="Logout" placement="right-start" arrow>
                        <ListItemIcon>
                            <LogoutIcon />
                        </ListItemIcon>
                    </Tooltip>
                </StyledListItemButton>
            </Drawer>
        </React.Fragment>
    )
});

export default NavMenu