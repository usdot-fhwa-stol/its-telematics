import { getCurrentUserAccess } from './api-user';

const hasValidIdentifiers = (userId, orgId) => {
    const normalizedUserId = parseInt(userId);
    const normalizedOrgId = parseInt(orgId);
    return !Number.isNaN(normalizedUserId) && normalizedUserId > 0
        && !Number.isNaN(normalizedOrgId) && normalizedOrgId > 0;
};

const getVerifiedAdminAccess = async (userId, orgId) => {
    if (!hasValidIdentifiers(userId, orgId)) {
        return false;
    }

    const currentUserAccess = await getCurrentUserAccess();
    return currentUserAccess !== undefined && currentUserAccess.can_access_user_list === true;
};

export { getVerifiedAdminAccess };
