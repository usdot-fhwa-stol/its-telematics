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
import React from 'react';
import { useStorageString, useStorageNumber, useClearStorage } from "../hooks/useStorage";

const AuthContext = React.createContext({
  isAuth: false,
  username: null,
  email: null,
  sessionToken: null,
  sessionExpiredAt: null,
  last_seen_at: null,
  org_id: null,
  org_name: null,
  is_admin: null,
  user_id: null,
  role: null,
  view_count: null,
  login: (id, username, sessionToken, sessionExpiredAt, email, last_seen_at, org_id,org_name, name, is_admin) => { },
  logout: () => { },
  updateRole: (role) => { },
  updateOrg: (org_id, org_name) => { },
  updateSessionToken: (token) => { },
})

export const AuthContextProvider = (props) => {
  const [isAuthenticated, setIsAuthenticated] = useStorageString("isAuth", false);
  const [username, setUsername] = useStorageString("username", null);
  const [email, setEmail] = useStorageString("email", null);
  const [role, setRole] = useStorageString("role", null);
  const [is_admin, setIsAdmin] = useStorageString("is_admin", null);
  const [user_id, setUserId] = useStorageString("user_id", null);
  const [last_seen_at, setLastSeenAt] = useStorageString("last_seen_at", null);
  const [org_id, setOrgId] = useStorageString("org_id", null);
  const [org_name, setOrgName] = useStorageString("org_name", null);
  const [name, setName] = useStorageString("name", null);
  const [sessionToken, setSessionToken] = useStorageString("sessionToken", null);
  const clearStorage = useClearStorage();
  const [sessionExpiredAt, setSessionExpiredAt] = useStorageNumber("sessionExpiredAt",0);

  const loginHandler = (user_id, username, sessionToken, sessionExpiredAt, email, last_seen_at, org_id,org_name, name, is_admin) => {
    if (username !== undefined && username !== ""
        && sessionToken !== undefined && sessionToken !== "") {
        setUserId(user_id);
        setIsAuthenticated(true);
        setUsername(username);
        setEmail(email);
        setSessionToken(sessionToken);
        setSessionExpiredAt(sessionExpiredAt);
        setLastSeenAt(last_seen_at);
        setOrgId(org_id);
        setOrgName(org_name)
        setName(name);
        setIsAdmin(is_admin);
        return true;
    } else {
        setIsAuthenticated(false);
        return false;
    }
}

  const logoutHandler = () => {
    setIsAuthenticated(false);
    setUsername(null);
    setRole(null);
    setUserId(null);
    setEmail(null);
    setSessionToken(null);
    setLastSeenAt(null);
    setOrgId(null);
    setName(null);
    setIsAdmin(null);
    clearStorage();
  }

  const updateRoleHandler = (role) => {
    setRole(role);
  }
  const setSessionTokenHandler = (token) => {
    setSessionToken(token);
  }
  const updateOrgHandler = (org_id, org_name) => {
    setOrgName(org_name);
    setOrgId(org_id);
  }

  return <AuthContext.Provider value={{
    user_id: user_id,
    isAuth: isAuthenticated,
    username: username,
    email: email,
    sessionToken: sessionToken,
    last_seen_at: last_seen_at,
    org_id: org_id,
    name: name,
    org_name: org_name,
    is_admin: is_admin,
    role: role,
    sessionExpiredAt: sessionExpiredAt,
    login: loginHandler,
    logout: logoutHandler,
    updateRole: updateRoleHandler,
    updateOrg: updateOrgHandler,
    updateSessionToken: setSessionTokenHandler
  }}>{props.children}</AuthContext.Provider>
}

export default AuthContext;
