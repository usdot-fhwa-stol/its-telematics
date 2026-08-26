import { expect, jest, test } from '@jest/globals';
import * as userApi from '../../api/api-user';
import { getVerifiedAdminAccess } from '../../api/api-admin-access';

jest.mock('../../api/api-user');

beforeEach(() => {
    jest.clearAllMocks();
});

test('returns false for invalid identifiers', async () => {
    await expect(getVerifiedAdminAccess(undefined, 1)).resolves.toBe(false);
    expect(userApi.getCurrentUserAccess).not.toHaveBeenCalled();
});

test('returns true when backend confirms current user can access the user list', async () => {
    userApi.getCurrentUserAccess.mockResolvedValue({
        can_access_user_list: true,
        role: "Admin",
        is_admin: "no"
    });

    await expect(getVerifiedAdminAccess(1, 1)).resolves.toBe(true);
});

test('returns false for non-admin user', async () => {
    userApi.getCurrentUserAccess.mockResolvedValue({
        can_access_user_list: false,
        role: "Viewer",
        is_admin: "no"
    });

    await expect(getVerifiedAdminAccess(1, 1)).resolves.toBe(false);
});
