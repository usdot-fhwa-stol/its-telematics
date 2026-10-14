import { expect, jest, test } from '@jest/globals';
import { render, screen, waitFor } from "@testing-library/react";
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import * as adminAccessApi from '../../api/api-admin-access';
import MainRouter from '../../components/layout/MainRouter';
import AuthContext from '../../context/auth-context';
import ServerContext from '../../context/server-context';

jest.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: () => false,
        registerPlugin: () => ({})
    }
}));

jest.mock('../../context/auth-context', () => {
    const React = require('react');
    return React.createContext({});
});

jest.mock('../../context/server-context', () => {
    const React = require('react');
    return React.createContext({});
});

jest.mock('../../pages/AdminPage', () => () => <div>Admin Page</div>);
jest.mock('../../pages/Dashboard', () => () => <div>Dashboard Page</div>);
jest.mock('../../pages/EventPage', () => () => <div>Events Page</div>);
jest.mock('../../pages/ForgetPasswordPage', () => () => <div>Forget Password Page</div>);
jest.mock('../../pages/Login', () => () => <div>Login Page</div>);
jest.mock('../../pages/RegisterUserPage', () => () => <div>Register User Page</div>);
jest.mock('../../pages/ROS2RosbagPage', () => () => <div>ROS2 Rosbag Page</div>);
jest.mock('../../pages/RSUManagementPage', () => () => <div>RSU Management Page</div>);
jest.mock('../../pages/TopicPage', () => () => <div>Topics Page</div>);
jest.mock('../../pages/ServerConfigPage', () => () => <div>Server Config Page</div>);

const authContextValue = {
    sessionToken: "token",
    user_id: 1,
    org_id: 1,
    is_admin: 1,
    role: "Admin",
};

const serverContextValue = {
    isConfigured: true,
    isInitialized: true,
};

test('MainRouter redirects away from admin page when backend denies admin access', async () => {
    jest.spyOn(adminAccessApi, "getVerifiedAdminAccess").mockResolvedValue(false);

    render(
        <ServerContext.Provider value={serverContextValue}>
            <AuthContext.Provider value={authContextValue}>
                <MemoryRouter initialEntries={['/telematic/admin']}>
                    <MainRouter />
                </MemoryRouter>
            </AuthContext.Provider>
        </ServerContext.Provider>
    );

    await waitFor(() => {
        expect(screen.getByText('Events Page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Admin Page')).toBeNull();
});

test('MainRouter keeps admin page when backend confirms admin access', async () => {
    jest.spyOn(adminAccessApi, "getVerifiedAdminAccess").mockResolvedValue(true);

    render(
        <ServerContext.Provider value={serverContextValue}>
            <AuthContext.Provider value={authContextValue}>
                <MemoryRouter initialEntries={['/telematic/admin']}>
                    <MainRouter />
                </MemoryRouter>
            </AuthContext.Provider>
        </ServerContext.Provider>
    );

    await waitFor(() => {
        expect(screen.getByText('Admin Page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Events Page')).toBeNull();
});

test('MainRouter keeps admin page for server admin even without org admin role', async () => {
    jest.spyOn(adminAccessApi, "getVerifiedAdminAccess").mockResolvedValue(true);

    render(
        <ServerContext.Provider value={serverContextValue}>
            <AuthContext.Provider value={authContextValue}>
                <MemoryRouter initialEntries={['/telematic/admin']}>
                    <MainRouter />
                </MemoryRouter>
            </AuthContext.Provider>
        </ServerContext.Provider>
    );

    await waitFor(() => {
        expect(screen.getByText('Admin Page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Events Page')).toBeNull();
});

afterEach(() => {
    jest.clearAllMocks();
});
