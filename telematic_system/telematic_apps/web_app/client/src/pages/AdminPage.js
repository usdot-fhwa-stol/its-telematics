import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { Grid, Typography } from '@mui/material';
import React, { useEffect } from 'react';
import { addOrgUser, deleteOrgUser, listOrgUsers, listOrgs, updateOrgUser } from '../api/api-org';
import { listUsers, updateUserServerAdmin } from '../api/api-user';
import { NOTIFICATION_STATUS } from '../components/topics/TopicMetadata';
import Notification from '../components/ui/Notification';
import { PageAvatar } from '../components/ui/PageAvatar';
import { USER_ROLES } from '../components/users/UserMetadata';
import UserRoleManagement from '../components/users/admin/UserRoleManagement';
import AuthContext from '../context/auth-context';

const AdminPage = React.memo(() => {
    //Add Alert notification
    const [alertStatus, setAlertStatus] = React.useState({});
    const [users, setUsers] =  React.useState([]);
    const [orgs, setOrgs] =  React.useState([]);
    const [orgsUsers, setOrgsUsers] =  React.useState([]);
    const authContxt = React.useContext(AuthContext);

    const closeAlertHandler = () => {
        setAlertStatus({
            open: false,
            severity: NOTIFICATION_STATUS.SUCCESS,
            title: '',
            message: ''
        });
    }

    const showRequestError = (response_data) => {
        if (response_data !== undefined && response_data.errCode !== undefined && response_data.errMsg !== undefined) {
            setAlertStatus({
                open: true,
                severity: NOTIFICATION_STATUS.ERROR,
                title: 'Error',
                message: response_data.errMsg
            });
            return true;
        }
        return false;
    }

    const handleAddUserToOrg = (data) => {
        const response = addOrgUser(data);
        response.then(response_data => {
            if (showRequestError(response_data)) {
                return;
            }
            if (response_data.errCode === undefined) {
                setOrgsUsers(prev => [...prev, response_data])
            }
        }).catch(error => {
            console.log(error);
        })
    }

    const handleUserOrgRoleChange = (data) => {
        const response = updateOrgUser(data);
        response.then(response_data => {
            if (showRequestError(response_data)) {
                return;
            }
            if (response_data.errCode === undefined && Array.isArray(response_data) && response_data.length > 0) {
                setOrgsUsers(prev => [...prev.filter(item => item.id !== response_data[0].id), response_data[0]])
            }
        }).catch(error => {
            console.log(error);
        })
    }

    const handleUserOrgRoleDelete = (data) => {
        const response = deleteOrgUser(data);
        response.then(response_data => {
            if (showRequestError(response_data)) {
                return;
            }
            if (response_data.errCode === undefined && response_data.message === undefined && Array.isArray(response_data) && response_data.length > 0) {
                let defaultUserOrg = {
                    user_id: data.user_id,
                    org_id: 1,
                    role: USER_ROLES.VIEWER
                }
                setOrgsUsers(prev => [...prev.filter(item => item.user_id !== data.user_id || item.org_id !== data.org_id), defaultUserOrg])
            } else if (response_data.errCode === undefined) {
                setOrgsUsers(prev => [...prev.filter(item => item.user_id !== data.user_id || item.org_id !== data.org_id)])
            }
        }).catch(error => {
            console.log(error);
        })
    }
    const handleChangeServerAdmin = (userData) => {
        const response = updateUserServerAdmin(userData);
        let filteredUser = users.filter(item => item.id === userData.user_id)
        filteredUser[0].is_admin = userData.is_admin === 1 ? "yes" : "no";
        response.then(response_data => {
            if (showRequestError(response_data)) {
                return;
            }
            if (response_data.errCode === undefined) {
                setUsers(prev => [...prev.filter(item => item.id !== userData.user_id), filteredUser[0]])
            }
        }).catch(error => {
            console.log(error);
        })
    }

    useEffect(() => {
        const user_response = listUsers();
        user_response.then(data => {
            if (showRequestError(data)) {
                return;
            }
            if (data !== undefined && Array.isArray(data) && data.length !== 0) {
                let userList = [];
                data.forEach(user => {
                    if ((parseInt(authContxt.is_admin) === 1)
                        || (parseInt(authContxt.is_admin) !== 1 && user.org_id === parseInt(authContxt.org_id))) {
                        userList.push(user);
                    }
                })
                setUsers(userList);
            }
        }).catch(err => {
            if (err.errCode !== undefined && err.errMsg !== undefined) {
                setAlertStatus({
                    open: true,
                    severity: NOTIFICATION_STATUS.ERROR,
                    title: 'Error',
                    message: err.errMsg
                });
            }
        });

        const org_response = listOrgs();
        org_response.then(data => {
            if (showRequestError(data)) {
                return;
            }
            if (data !== undefined && Array.isArray(data) && data.length !== 0) {
                setOrgs(data);
            }
        }).catch(err => {
            if (err.errCode !== undefined && err.errMsg !== undefined) {
                setAlertStatus({
                    open: true,
                    severity: NOTIFICATION_STATUS.ERROR,
                    title: 'Error',
                    message: err.errMsg
                });
            }
        });

        const org_users_response = listOrgUsers();
        org_users_response.then(data => {
            if (showRequestError(data)) {
                return;
            }
            if (data !== undefined && Array.isArray(data) && data.length !== 0) {
                setOrgsUsers(data);
            }
        }).catch(err => {
            if (err.errCode !== undefined && err.errMsg !== undefined) {
                setAlertStatus({
                    open: true,
                    severity: NOTIFICATION_STATUS.ERROR,
                    title: 'Error',
                    message: err.errMsg
                });
            }
        });
    }, [authContxt.org_id, authContxt.is_admin])
    return (
        <React.Fragment>
            <Notification open={alertStatus.open}
                closeAlert={closeAlertHandler}
                severity={alertStatus.severity}
                title={alertStatus.title}
                message={alertStatus.message} />
            {
                (parseInt(authContxt.is_admin) === 1 || authContxt.role === USER_ROLES.ADMIN) &&
                <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
                    <Grid item xs={12}>
                        <PageAvatar icon={<AdminPanelSettingsIcon />} title="Administrator" />
                    </Grid>
                    <Grid item xs={12}>
                        <Typography sx={{ marginLeft: 2 }}>Current Organization: {authContxt.org_name != null && authContxt.org_name.length > 0 ? authContxt.org_name : "Org missing"} </Typography>
                        <Typography sx={{ marginLeft: 2 }}>Current User Name: {authContxt.username} </Typography>
                    </Grid>
                </Grid>
            }
            {
                (parseInt(authContxt.is_admin) === 1 || authContxt.role === USER_ROLES.ADMIN) &&
                <UserRoleManagement
                    users={users}
                    orgs={orgs}
                    orgsusers={orgsUsers}
                    onAddUserToOrg={handleAddUserToOrg}
                    onUserOrgRoleChange={handleUserOrgRoleChange}
                    onUserOrgRoleDelete={handleUserOrgRoleDelete}
                    onChangeServerAdmin={handleChangeServerAdmin} />
            }
        </React.Fragment>
    )
});

export default AdminPage