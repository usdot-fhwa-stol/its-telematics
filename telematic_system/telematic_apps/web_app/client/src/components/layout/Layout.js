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
import { AppBar, Button, CssBaseline, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, List, ListItemButton, ListItemText, Toolbar } from '@mui/material';
import { Box } from '@mui/system';
import { withStyles } from '@mui/styles';
import React, { useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { checkServerSession, deleteUser } from '../../api/api-user';
import logo from '../../assets/CAV_telematics_tool_logo_color.png';
import AuthContext from '../../context/auth-context';
import NavMenu from './NavMenu';

const Layout = React.memo((props) => {
    const authContext = useContext(AuthContext);
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const isMobile = Capacitor.isNativePlatform();
    const handleLogout = React.useCallback(() => {
        deleteUser(authContext.username).then(status => {
            authContext.logout();
            setOpen(false);
        }).catch(error => {
            console.log("error logout: " + error);
        });
    }, [authContext]);

    useEffect(() => {
        //Check token expiration
        if (authContext.sessionToken === undefined || (authContext.sessionToken !== null && authContext.sessionExpiredAt < Math.round(new Date().getTime() / 1000))) {
            //expired
            setOpen(true);
        }
        else if (authContext.sessionToken !== null) {
            //valid tokened, update headers with auth token
            const response = checkServerSession(authContext.sessionToken);
            response.then((data) => {
                if (data !== undefined && data.expired !== undefined && data.expired) {
                    setOpen(true);
                }
            }).catch(error => {
                setOpen(true);
            });
        }
    }, [authContext.sessionToken, authContext.sessionExpiredAt])

    const StyledListItemButton = withStyles({
        root: {
            backgroundColor: "#e3e4e9",
            borderTopRightRadius: '15px',
            borderTopLeftRadius: '15px',
            border: '1px solid #fff',
            fontWeight: 'bolder',
            "&.Mui-selected": {
                backgroundColor: "#748c93",
                color: '#fff'
            },
            "&.Mui-selected:hover": {
                backgroundColor: "#748c93",
                color: '#fff'
            }
        },
    })(ListItemButton)

    if (isMobile) {
        return (
            <React.Fragment>
                <CssBaseline />
                <Box component="main" sx={{ flexGrow: 1 }}>
                    {props.children}
                </Box>
                {authContext.sessionToken !== null &&
                    <Dialog
                        open={open}
                        aria-labelledby="timeout-dialog-title"
                        aria-describedby="timeout-dialog-description" >
                        <DialogTitle id="timeout-dialog-title" sx={{ color: 'black', fontWeight: 'bolder' }}>
                            Session Timeout Alert
                        </DialogTitle>
                        <DialogContent>
                            <DialogContentText id="timeout-dialog-description" sx={{ color: 'black' }}>
                                Your session has expired!
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions sx={{ display: "block" }}>
                            <Box sx={{
                                margin: 0,
                                padding: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                textAlign: 'center',
                                justifyContent: 'center'
                            }}>
                                <Button variant='outlined' sx={{ marginTop: '5px' }} onClick={handleLogout}>Logout</Button>
                            </Box>
                        </DialogActions>
                    </Dialog>
                }
            </React.Fragment>
        );
    }

    return (
        <React.Fragment>
            {authContext.sessionToken !== null &&
                <Box sx={{ display: 'flex' }}>
                    <CssBaseline />
                    <AppBar position="fixed" style={{ background: '#fff' }} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, marginBottom: 0 }}>
                        <Toolbar>
                            <Box
                                component="img"
                                sx={{ width: '150px', height: '70px', marginRight: '10px' }}
                                alt="Logo"
                                src={logo} />
                            <List component="nav" sx={{ display: 'flex', fontWeight: "bolder", paddingBottom: 0 }}>
                                <StyledListItemButton
                                    component={Link} to="/dashboard"
                                    selected={"/dashboard" === location.pathname}
                                    divider={true}>
                                    <ListItemText primary="Dashboard" primaryTypographyProps={{
                                        fontSize: '150%',
                                        color: "/dashboard" === location.pathname ? "#ffffff" : '#2c7474'
                                    }} />
                                </StyledListItemButton>
                                <StyledListItemButton
                                    component={Link} to="/telematic/events"
                                    selected={location.pathname.includes("/telematic")}
                                    divider={true}>
                                    <ListItemText primary="Live Data" primaryTypographyProps={{
                                        fontSize: '150%',
                                        color: location.pathname.includes("/telematic") ? "#ffffff" : '#2c7474'
                                    }} />
                                </StyledListItemButton>
                                <StyledListItemButton
                                    component={Link} to="/historical/data"
                                    selected={location.pathname.includes("/historical/data")}
                                    divider={true}>
                                    <ListItemText primary="Historical Data" primaryTypographyProps={{
                                        fontSize: '150%',
                                        color: location.pathname.includes("/historical/data") ? "#ffffff" : '#2c7474'
                                    }} />
                                </StyledListItemButton>
                            </List>
                        </Toolbar>
                    </AppBar>
                    {"/dashboard" !== location.pathname && <NavMenu />}
                    <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                        <Toolbar />
                        {props.children}
                    </Box>
                </Box>
            }
            {
                authContext.sessionToken !== null &&
                <Dialog
                    open={open}
                    aria-labelledby="timeout-dialog-title"
                    aria-describedby="timeout-dialog-description" >
                    <DialogTitle id="timeout-dialog-title" sx={{ color: 'black', fontWeight: 'bolder' }}>
                        Session Timeout Alert
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText id="timeout-dialog-description" sx={{ color: 'black' }}>
                            Your session has expired!
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions sx={{ display: "block" }}>
                        <Box sx={{
                            margin: 0,
                            padding: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            textAlign: 'center',
                            justifyContent: 'center'
                        }}>
                            <Button variant='outlined' sx={{ marginTop: '5px' }} onClick={handleLogout}>Logout</Button>
                        </Box>
                    </DialogActions>
                </Dialog>
            }

            {
                authContext.sessionToken === null &&
                <Box component="main" sx={{ flexGrow: 1, minWidth: '1000px' }}>
                    {props.children}
                </Box>
            }
        </React.Fragment >
    )
});

export default Layout