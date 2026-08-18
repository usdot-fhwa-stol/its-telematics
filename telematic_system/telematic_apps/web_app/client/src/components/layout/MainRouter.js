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
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Box, CircularProgress } from '@mui/material';
import { getVerifiedAdminAccess } from '../../api/api-admin-access';
import AuthContext from '../../context/auth-context';
import ServerContext from '../../context/server-context';
import AdminPage from '../../pages/AdminPage';
import Dashboard from '../../pages/Dashboard';
import EventPage from '../../pages/EventPage';
import ForgetPasswordPage from '../../pages/ForgetPasswordPage';
import Login from '../../pages/Login';
import RegisterUserPage from '../../pages/RegisterUserPage';
import ROS2RosbagPage from '../../pages/ROS2RosbagPage';
import RSUManagementPage from '../../pages/RSUManagementPage';
import TopicPage from '../../pages/TopicPage';
import ServerConfigPage from '../../pages/ServerConfigPage';

const MainRouter = React.memo(() => {
  const authContext = useContext(AuthContext);
  const serverContext = useContext(ServerContext);
  const isMobile = Capacitor.isNativePlatform();
  const [hasAdminAccess, setHasAdminAccess] = useState(null);
  const adminAccessRequestIdRef = useRef(0);

  const postLoginRoute = isMobile ? "/dashboard" : "/telematic/events";

  useEffect(() => {
    if (authContext.sessionToken === null) {
      setHasAdminAccess(false);
      return;
    }

    const requestId = adminAccessRequestIdRef.current + 1;
    adminAccessRequestIdRef.current = requestId;
    setHasAdminAccess(null);

    getVerifiedAdminAccess(authContext.user_id, authContext.org_id).then((isAdmin) => {
      if (adminAccessRequestIdRef.current === requestId) {
        setHasAdminAccess(isAdmin);
      }
    }).catch(() => {
      if (adminAccessRequestIdRef.current === requestId) {
        setHasAdminAccess(false);
      }
    });
  }, [authContext.org_id, authContext.sessionToken, authContext.user_id]);

  const adminRouteElement = hasAdminAccess === null
    ? (
      <Box sx={{ display: 'flex', width: '100%', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
    : (hasAdminAccess ? <AdminPage /> : <Navigate to={postLoginRoute} replace></Navigate>);

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
        {authContext.sessionToken !== null && <Route path="/telematic/rsu-management" element={<RSUManagementPage />} />}
        {authContext.sessionToken !== null && <Route path="/historical/data/ros2/rosbag" element={<ROS2RosbagPage />} />}
        {authContext.sessionToken !== null && <Route path="/historical/data"  element={<Navigate to="/historical/data/ros2/rosbag" replace></Navigate>}/>}
        {authContext.sessionToken !== null && <Route path="/telematic/admin" element={adminRouteElement} />}
        {authContext.sessionToken !== null && <Route path="/dashboard" element={<Dashboard />} />}
        {authContext.sessionToken === null && <Route path="/telematic/login" element={<Login />} />}
        {authContext.sessionToken !== null && <Route path="/telematic/login" element={<Navigate to={postLoginRoute} replace></Navigate>}></Route>}
        {authContext.sessionToken === null && <Route path="/telematic/forget/password" element={<ForgetPasswordPage />} />}
        {authContext.sessionToken === null && <Route path="/telematic/register/user" element={<RegisterUserPage />} />}
        {authContext.sessionToken === null && <Route path="*" element={<Navigate to="/telematic/login" replace></Navigate>}></Route>}
        {!isMobile && authContext.sessionToken !== null && <Route path="*" element={<Navigate to={postLoginRoute} replace></Navigate>}></Route>}
        {isMobile && authContext.sessionToken !== null && <Route path="*" element={<Navigate to="/dashboard" replace></Navigate>}></Route>}
      </Routes>
    </React.Fragment>
  )
});

export default MainRouter