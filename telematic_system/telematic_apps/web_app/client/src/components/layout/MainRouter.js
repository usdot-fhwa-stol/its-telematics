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
import React, { useContext } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Box, CircularProgress } from '@mui/material';
import AuthContext from '../../context/auth-context';
import ServerContext from '../../context/server-context';
import AdminPage from '../../pages/AdminPage';
import EventPage from '../../pages/EventPage';
import ForgetPasswordPage from '../../pages/ForgetPasswordPage';
import Dashboard from '../../pages/Dashboard';
import Login from '../../pages/Login';
import RegisterUserPage from '../../pages/RegisterUserPage';
import TopicPage from '../../pages/TopicPage';
import ServerConfigPage from '../../pages/ServerConfigPage';
import { USER_ROLES } from '../users/UserMetadata';
import ROS2RosbagPage from '../../pages/ROS2RosbagPage';

const MainRouter = React.memo(() => {
  const authContext = useContext(AuthContext);
  const serverContext = useContext(ServerContext);
  const isMobile = Capacitor.isNativePlatform();

  const postLoginRoute = isMobile ? "/dashboard" : "/telematic/events";

  if (isMobile && !serverContext.isInitialized) {
    return (
      <Box sx={{ display: 'flex', width: '100%', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Show server config page if not configured (mobile only)
  if (isMobile && !serverContext.isConfigured) {
    return (
      <Routes>
        <Route path="*" element={<ServerConfigPage />} />
      </Routes>
    );
  }

  return (
    <React.Fragment>
      <Routes>
        {authContext.sessionToken !== null && <Route path="/telematic/events" element={<EventPage />} />}
        {authContext.sessionToken !== null && <Route path="/telematic/topics" element={<TopicPage />} />}
        {authContext.sessionToken !== null && <Route path="/historical/data/ros2/rosbag" element={<ROS2RosbagPage />} />}
        {authContext.sessionToken !== null && <Route path="/historical/data"  element={<Navigate to="/historical/data/ros2/rosbag" replace></Navigate>}/>}
        {authContext.sessionToken !== null && (parseInt(authContext.is_admin) === 1 || authContext.role === USER_ROLES.ADMIN) && <Route path="/telematic/admin" element={<AdminPage />} />}
        {authContext.sessionToken !== null && <Route path="/dashboard" element={<Dashboard />} />}
        {authContext.sessionToken === null && <Route path="/telematic/login" element={<Login />} />}
        {authContext.sessionToken !== null && <Route path="/telematic/login" element={<Navigate to={postLoginRoute} replace></Navigate>}></Route>}
        {authContext.sessionToken === null && <Route path="/telematic/forget/password" element={<ForgetPasswordPage />} />}
        {authContext.sessionToken === null && <Route path="/telematic/register/user" element={<RegisterUserPage />} />}
        {authContext.sessionToken === null && <Route path="*" element={<Navigate to="/telematic/login" replace></Navigate>}></Route>}
        {isMobile && authContext.sessionToken !== null && <Route path="*" element={<Navigate to="/dashboard" replace></Navigate>}></Route>}
      </Routes>
    </React.Fragment>
  )
});

export default MainRouter