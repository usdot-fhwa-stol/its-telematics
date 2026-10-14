import axios from 'axios';
import {env} from "../env"
import { constructError } from './api-utils';

const createOrgUserPayload = (reqData = {}) => ({
    org_id: reqData.org_id,
    user_id: reqData.user_id,
    role: reqData.role
});

const listOrgs = async () => {
    const URL = `${env.REACT_APP_WEB_SERVER_URI}/api/org/all`
    try {
        const { data } = await axios.get(URL, { withCredentials: true });
        return data;
    } catch (err) {
        
          return constructError(err)
  
    }
}

const listOrgUsers = async () => {
    const URL = `${env.REACT_APP_WEB_SERVER_URI}/api/org/all/users`
    try {
        const { data } = await axios.get(URL, { withCredentials: true });
        return data;
    } catch (err) {
        
          return constructError(err)
  
    }
}

const addOrgUser = async (reqData) => {
    const URL = `${env.REACT_APP_WEB_SERVER_URI}/api/org/user/add`

    try {
        const { data } = await axios.post(URL, {
            data: createOrgUserPayload(reqData)
        }, { withCredentials: true });
        return data;
    } catch (err) {
        
          return constructError(err)
  
    }
}

const getUserRole = async (reqData) => {
    const URL = `${env.REACT_APP_WEB_SERVER_URI}/api/org/role/get`
    try {
        const { data } = await axios.post(URL, {
            data: reqData
        }, { withCredentials: true });
        return data;
    } catch (err) {
        
          return constructError(err)
  
    }
}


const getOrgsByUser = async (userId) => {
    const URL = `${env.REACT_APP_WEB_SERVER_URI}/api/org/user/find`

    try {
        const { data } = await axios.post(URL, {
            data: { user_id: userId }
        }, { withCredentials: true });
        return data;
    } catch (err) {
        
          return constructError(err)
  
    }
}

const updateOrgUser = async (reqData) => {
    const URL = `${env.REACT_APP_WEB_SERVER_URI}/api/org/user/update`

    try {
        const { data } = await axios.post(URL, {
            data: createOrgUserPayload(reqData)
        }, { withCredentials: true });
        return data;
    } catch (err) {
        
          return constructError(err)
  
    }
}


const deleteOrgUser = async (req) => {
    const URL = `${env.REACT_APP_WEB_SERVER_URI}/api/org/user/delete`
    if (req === undefined || req.user_id === undefined || req.org_id === undefined) {
        return { errCode: "", errMsg: "Cannot delete org user because request data is empty"};
    }
    try {
        const { data } = await axios.delete(URL + "?org_id=" + req.org_id + "&user_id=" + req.user_id, { withCredentials: true });
        return data;
    } catch (err) {        
          return constructError(err)
  
    }
}



export { listOrgs, listOrgUsers, addOrgUser, updateOrgUser, deleteOrgUser, getUserRole, getOrgsByUser }