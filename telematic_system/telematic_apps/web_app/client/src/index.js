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
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Capacitor } from '@capacitor/core';

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
import { CookiesProvider } from "react-cookie";
import { BrowserRouter } from 'react-router-dom';
import { ServerContextProvider } from './context/server-context';
import { AuthContextProvider } from './context/auth-context';
import { TopicContextProvider } from './context/topic-context';
import {ROS2RosbagContextProvider} from './context/ros2-rosbag-context';

// Import mobile-specific CSS
import './mobile.css';

// Detect if running in Capacitor and add class to html and body
if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('mobile-app');
  document.body.classList.add('mobile-app');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <CookiesProvider>
        <ServerContextProvider>
          <AuthContextProvider>
            <TopicContextProvider>
              <ROS2RosbagContextProvider>
                <App />
              </ROS2RosbagContextProvider>
            </TopicContextProvider>
          </AuthContextProvider>
        </ServerContextProvider>
      </CookiesProvider>
    </BrowserRouter>
  </React.StrictMode>
);