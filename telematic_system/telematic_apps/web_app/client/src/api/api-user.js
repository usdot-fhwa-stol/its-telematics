import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import {env} from "../env"
import { constructError } from './api-utils';

const isMobile = Capacitor.isNativePlatform();

const REQUEST_TIMEOUT_MS = isMobile ? 60000 : 0;

const createServerAdminUpdatePayload = (req = {}) => ({
    user_id: req.user_id,
    is_admin: req.is_admin
});


const registerNewUser = async (username, email, password, org_id) => {
    const URL = `${env.REACT_APP_WEB_SERVER_URI}/api/users/register`

    try {
        const { data } = await axios.post(URL, {
            username: username,
            email: email,
            password: password,
            org_id: org_id
        }, { withCredentials: true });
        return data;
    } catch (err) {
        
          return constructError(err)
  
    }
}

const updatePassword = async (username, email, new_password) => {
    const URL = `${env.REACT_APP_WEB_SERVER_URI}/api/users/forget/password`
    try {
        const { data } = await axios.post(URL, {
            username: username,
            email: email,
            new_password: new_password
        }, { withCredentials: true });
        return data;
    } catch (err) {
        
          return constructError(err)
  
    }
}

const loginUser = async (username, password) => {
    const URL = `${env.REACT_APP_WEB_SERVER_URI}/api/users/login`
    try {
        const { data } = await axios.post(URL, {
            username: username,
            password: password
        }, { withCredentials: true });   
        if(data.token ===undefined)
        {
            return { errCode: 500, errMsg: "No token"}
        }     
        axios.defaults.headers.common['Authorization'] = data.token;
        return data;
    } catch (err) {
        
        return { errCode: err.response !==undefined ? err.response.status: err.code, errMsg: err.response!==undefined && err.response.data !== undefined && err.response.data.message !== undefined ? err.response.data.message : (err.response !==undefined? err.response.statusText : err.message)}
    }
}


const deleteUser = async (username) => {
    const URL = `${env.REACT_APP_WEB_SERVER_URI}/api/users/delete`

    try {
        const { data } = await axios.delete(URL + "?username=" + username, { withCredentials: true, timeout: REQUEST_TIMEOUT_MS });
        return data;
    } catch (err) {

          return constructError(err)

    }
}


const listUsers = async () => {
    const URL = `${env.REACT_APP_WEB_SERVER_URI}/api/users/all`

    try {
        const { data } = await axios.get(URL, { withCredentials: true });
        return data;
    } catch (err) {
        
          return constructError(err)
   
    }
}
const getCurrentUserAccess = async () => {
    const URL = `${env.REACT_APP_WEB_SERVER_URI}/api/users/access`

    try {
        const { data } = await axios.get(URL, { withCredentials: true });
        return data;
    } catch (err) {

          return constructError(err)

    }
}
const updateUserServerAdmin = async (req) => {
    const URL = `${env.REACT_APP_WEB_SERVER_URI}/api/users/update/server/admin`
    try {
        const { data } = await axios.post(URL, createServerAdminUpdatePayload(req), { withCredentials: true });
        return data;
    } catch (err) {
        
          return constructError(err)
  
    }
}
const checkServerSession = async (token) => {
    axios.defaults.headers.common['Authorization'] = token;
    const URL = `${env.REACT_APP_WEB_SERVER_URI}/api/users/ping`
    try {
        const { data } = await axios.get(URL, { withCredentials: true, timeout: REQUEST_TIMEOUT_MS });
        return data;
    } catch (err) {
        
        return {
            errCode:  err.response !== undefined ? err.response.status : "", errMsg:  err.response !== undefined&& err.response.data !== undefined
                && err.response.data.message !== undefined ? err.response.data.message :  ( err.response !== undefined ? err.response.statusText: ""),
            expired:  err.response !== undefined && err.response.data !== undefined && err.response.data.reason !== undefined ? true : false
        }
    }
}

export { loginUser, deleteUser, updatePassword, registerNewUser, listUsers, getCurrentUserAccess, updateUserServerAdmin, checkServerSession }