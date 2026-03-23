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
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Alert, FormControl, Grid, Link, Snackbar, Typography } from '@mui/material';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import * as React from 'react';
import { Capacitor } from '@capacitor/core';
import { getOrgsByUser, listOrgs } from '../api/api-org';
import { loginUser } from '../api/api-user';
import AuthContext from '../context/auth-context';
import ServerContext from '../context/server-context';
import { getMobileWrapperStyles, getMobileContainerStyles, getMobileBoxStyles, getTextFieldStyles } from '../utils/mobileStyles';

const theme = createTheme();

const Login = React.memo(() => {
    const authContext = React.useContext(AuthContext);
    const serverContext = React.useContext(ServerContext);
    const [loginState, setLoginState] = React.useState(true);
    const [loginErrMsg, setLoginErrMsg] = React.useState('');
    // Initialize isMobile immediately, not in useEffect
    const [isMobile] = React.useState(Capacitor.isNativePlatform());

    const handleChangeServer = () => {
        serverContext.resetServerConfig();
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const status = loginUser(data.get('username'), data.get("password"));

        //Checking if login is successful
        status.then(resData => {
            if (resData.errCode !== undefined) {
                setLoginErrMsg(resData.errMsg);
                setLoginState(false);
                return;
            }
            //Checking if user belong to an organization
            const org_user_response = getOrgsByUser(resData.id);
            org_user_response.then(userOrgsData => {
                if (userOrgsData !== undefined && Array.isArray(userOrgsData) && userOrgsData.length > 0) {
                    //Get Current active organization user role
                    userOrgsData.forEach(userOrg => {
                        if (userOrg.org_id === resData.org_id) {
                            authContext.updateRole(userOrg.role);
                        }
                    });
                    //Get current user organization name
                    const org_response = listOrgs();
                    org_response.then(data => {
                        if (data !== undefined && Array.isArray(data) && data.length !== 0) {
                            data.forEach(item => {
                                if (item !== undefined && item.id !== undefined && parseInt(item.id) === parseInt(resData.org_id)) {
                                    authContext.updateOrg(resData.org_id, item.name);
                                }
                            });
                        }
                    }).catch(err => {
                        console.error(err);
                        return;
                    });
                }
            }).catch(err => {
                console.error(err);
                return;
            });
            authContext.login(
                resData.id,
                resData.login,
                resData.token,
                resData.tokenExpiredAt,
                resData.email,
                resData.last_seen_at,
                resData.org_id,
                resData.org_name,
                resData.name,
                resData.is_admin);
            setLoginState(true);
        }).catch(error => {
            console.error(error);
            setLoginErrMsg('Your username or password is incorrect!');
            setLoginState(false);
            return;
        });
    };
    const handleClose = () => {
        setLoginState(true);
    };

    return (
        <React.Fragment>
            <ThemeProvider theme={theme}>
                <Snackbar
                    anchorOrigin={{ vertical: "top", horizontal: "center" }}
                    open={!loginState}
                    onClose={handleClose}
                    autoHideDuration={6000}
                    key="Login"
                    sx={{ zIndex: 9999 }}>
                    <Alert data-testid='alert-msg' onClose={handleClose} severity="error" sx={{ width: '100%' }}>
                        {loginErrMsg}
                    </Alert>
                </Snackbar>
                <Box sx={getMobileWrapperStyles(isMobile)}>
                    <Container 
                        component="main" 
                        maxWidth="xs"
                        sx={getMobileContainerStyles(isMobile)}
                    >
                        <Box
                            sx={getMobileBoxStyles(isMobile)}
                        >
                            <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                                <LockOutlinedIcon />
                            </Avatar>
                            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
                                <FormControl fullWidth>
                                    <TextField
                                        margin="normal"
                                        required
                                        id="username"
                                        inputProps={ {'data-testid':'username'}}
                                        label="User Name"
                                        name="username"
                                        autoComplete="username"
                                        autoFocus
                                        sx={getTextFieldStyles(isMobile)} />
                                </FormControl>
                                <FormControl fullWidth>
                                    <TextField
                                        margin="normal"
                                        required
                                        name="password"
                                        inputProps={{'data-testid':'password'}}
                                        label="Password"
                                        type="password"
                                        id="password"
                                        autoComplete="current-password"
                                        sx={getTextFieldStyles(isMobile)} />
                                </FormControl>
                                <Box>
                                    <Grid container spacing={isMobile ? 0 : 1} >
                                        <Grid item xs={6}></Grid>
                                        <Grid item xs={6}>
                                            <Link href="/telematic/forget/password" sx={{ float: 'right', fontSize: isMobile ? '0.85rem' : 'inherit' }}>Forgot Password?</Link>
                                        </Grid>
                                    </Grid>
                                </Box>
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    sx={{ mt: 3, mb: 2 }}>
                                    Sign In
                                </Button>
                            </Box>
                            <Box component="div" sx={{ width: '100%', textAlign: 'center' }}>
                                <Link href="/telematic/register/user" sx={{ fontSize: isMobile ? '0.85rem' : 'inherit' }}>
                                    Register user
                                </Link>
                                {isMobile && (
                                    <Box sx={{ mt: 2 }}>
                                        <Link
                                            component="button"
                                            variant="body2"
                                            onClick={handleChangeServer}
                                            sx={{ fontSize: '0.85rem' }}
                                        >
                                            Change Server
                                        </Link>
                                    </Box>
                                )}
                                {isMobile && serverContext.webServerUri && (
                                    <Box sx={{ mt: 1 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {serverContext.webServerUri}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Container>
                </Box>
            </ThemeProvider>
        </React.Fragment >
    );
});
export default Login;