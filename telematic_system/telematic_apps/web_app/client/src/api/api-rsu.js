/*
 * Copyright (C) 2026 LEIDOS.
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

import axios from 'axios';
import { env } from "../env";

const API_BASE_URL = `${env.REACT_APP_WEB_SERVER_URI}/api`

/**
 * API Service for RSU/TRU Management
 * Handles all HTTP requests for RSU and TRU status and configuration
 */
const rsuService = {
  /**
   * Get all TRU status information (TruConfigStatus)
   * @returns {Promise} Array of TruConfigStatus objects
   */
  getTRUStatuses: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/rsu-registration/all-tru-config`, { withCredentials: true });
      console.log('Fetched TRU statuses:', response.data);
      // API returns {message, data, count} - extract the data array
      return 'data' in response.data ? response.data.data : response.data;
    } catch (error) {
      console.error('Error fetching TRU statuses:', error);
      throw error;
    }
  },

  /**
   * Assign/Register RSU to a TRU
   * @param {Object} truConfigMessage - TruConfigMessage with unitConfig and rsuConfigs
   * @returns {Promise}
   */
  assignRSU: async (truConfigMessage) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/rsu-registration/assign-rsu`, truConfigMessage, { withCredentials: true });
      console.log('RSU assigned successfully:', response.data);
      return 'data' in response.data ? response.data.data : response.data;
    } catch (error) {
      console.error('Error assigning RSU:', error);
      throw error;
    }
  },

  /**
   * Update RSU configuration
   * @param {Object} truConfigMessage - TruConfigMessage with unitConfig and rsuConfigs
   * @returns {Promise}
   */
  updateRSUConfig: async (truConfigMessage) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/rsu-registration/update-rsu-config`, truConfigMessage, { withCredentials: true });
      console.log('RSU config updated successfully:', response.data);
      return 'data' in response.data ? response.data.data : response.data;
    } catch (error) {
      console.error('Error updating RSU config:', error);
      throw error;
    }
  },

  /**
   * Remove RSU assignment from TRU
   * @param {Object} truConfigMessage - TruConfigMessage with unitConfig and rsuConfigs to remove
   * @returns {Promise}
   */
  removeRSU: async (truConfigMessage) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/rsu-registration/remove-rsu`, truConfigMessage, { withCredentials: true });
      console.log('RSU removed successfully:', response.data);
      return 'data' in response.data ? response.data.data : response.data;
    } catch (error) {
      console.error('Error removing RSU:', error);
      throw error;
    }
  },

  /**
   * Get available topics for data selection
   * @param {Object} truTopicsMessage - TRUTopicsMessage with unitId and rsuTopics
   * @returns {Promise} TRUTopicsMessage with available topics
   */
  getAvailableTopics: async (truTopicsMessage) => {
    try {
      console.log('Fetching available topics with message:', truTopicsMessage);
      const response = await axios.post(`${API_BASE_URL}/data-selection/available-topics`, truTopicsMessage, {
        withCredentials: true
      });
      console.log('Fetched available topics:', response.data);
      return 'data' in response.data ? response.data.data : response.data;
    } catch (error) {
      console.error('Error fetching available topics:', error);
      throw error;
    }
  },

  /**
   * Confirm data selection for topics
   * @param {Object} truTopicsMessage - TRUTopicsMessage with unitId and selected rsuTopics
   * @returns {Promise} TRUTopicsMessage
   */
  confirmDataSelection: async (truTopicsMessage) => {
    try {
      console.log('Confirming data selection with message:', truTopicsMessage);
      const response = await axios.post(`${API_BASE_URL}/data-selection/confirm-topics`, truTopicsMessage, { withCredentials: true });
      console.log('Data selection confirmed:', response.data);
      return 'data' in response.data ? response.data.data : response.data;
    } catch (error) {
      console.error('Error confirming data selection:', error);
      throw error;
    }
  },
};

export default rsuService;
