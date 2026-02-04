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

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

/**
 * API Service for RSU/TRU Management
 * Handles all HTTP requests for RSU and TRU status and configuration
 */
const rsuService = {
  /**
   * Get all TRU (Telematic Roadside Unit) configurations
   * @returns {Promise} TruConfigMessage array
   */
  getTRUConfigs: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tru/configs`);
      return response.data;
    } catch (error) {
      console.error('Error fetching TRU configs:', error);
      throw error;
    }
  },

  /**
   * Get TRU configuration by unit ID
   * @param {string} unitId - The TRU unit ID
   * @returns {Promise} TruConfigMessage
   */
  getTRUConfigById: async (unitId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tru/configs/${unitId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching TRU config for ${unitId}:`, error);
      throw error;
    }
  },

  /**
   * Update TRU configuration
   * @param {string} unitId - The TRU unit ID
   * @param {Object} configData - TruConfigMessage data
   * @returns {Promise}
   */
  updateTRUConfig: async (unitId, configData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/tru/configs/${unitId}`, configData);
      return response.data;
    } catch (error) {
      console.error(`Error updating TRU config for ${unitId}:`, error);
      throw error;
    }
  },

  /**
   * Get all TRU status information
   * @returns {Promise} Array of TRU status objects
   */
  getTRUStatuses: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tru/status`);
      return response.data;
    } catch (error) {
      console.error('Error fetching TRU statuses:', error);
      throw error;
    }
  },

  /**
   * Get TRU status by unit ID
   * @param {string} unitId - The TRU unit ID
   * @returns {Promise} TRU status object
   */
  getTRUStatusById: async (unitId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tru/status/${unitId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching TRU status for ${unitId}:`, error);
      throw error;
    }
  },

  /**
   * Get all TRU topics
   * @returns {Promise} Array of TRUTopicsMessage
   */
  getTRUTopics: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tru/topics`);
      return response.data;
    } catch (error) {
      console.error('Error fetching TRU topics:', error);
      throw error;
    }
  },

  /**
   * Get TRU topics by unit ID
   * @param {string} unitId - The TRU unit ID
   * @returns {Promise} TRUTopicsMessage
   */
  getTRUTopicsById: async (unitId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tru/topics/${unitId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching TRU topics for ${unitId}:`, error);
      throw error;
    }
  },

  /**
   * Update TRU topics configuration
   * @param {string} unitId - The TRU unit ID
   * @param {Object} topicsData - TRUTopicsMessage data
   * @returns {Promise}
   */
  updateTRUTopics: async (unitId, topicsData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/tru/topics/${unitId}`, topicsData);
      return response.data;
    } catch (error) {
      console.error(`Error updating TRU topics for ${unitId}:`, error);
      throw error;
    }
  },

  /**
   * Get all RSU (Roadside Unit) configurations
   * @returns {Promise} Array of RSU configurations
   */
  getRSUConfigs: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/rsu/configs`);
      return response.data;
    } catch (error) {
      console.error('Error fetching RSU configs:', error);
      throw error;
    }
  },

  /**
   * Get RSU configuration by IP and port
   * @param {string} ip - RSU IP address
   * @param {number} port - RSU port
   * @returns {Promise} RSU configuration
   */
  getRSUConfigById: async (ip, port) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/rsu/configs/${ip}/${port}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching RSU config for ${ip}:${port}:`, error);
      throw error;
    }
  },

  /**
   * Register a new RSU
   * @param {Object} rsuData - RSU configuration data including RSUEndpoint
   * @returns {Promise}
   */
  registerRSU: async (rsuData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/rsu/configs`, rsuData);
      return response.data;
    } catch (error) {
      console.error('Error registering RSU:', error);
      throw error;
    }
  },

  /**
   * Update RSU configuration
   * @param {string} ip - RSU IP address
   * @param {number} port - RSU port
   * @param {Object} rsuData - Updated RSU configuration data
   * @returns {Promise}
   */
  updateRSU: async (ip, port, rsuData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/rsu/configs/${ip}/${port}`, rsuData);
      return response.data;
    } catch (error) {
      console.error(`Error updating RSU ${ip}:${port}:`, error);
      throw error;
    }
  },

  /**
   * Delete RSU
   * @param {string} ip - RSU IP address
   * @param {number} port - RSU port
   * @returns {Promise}
   */
  deleteRSU: async (ip, port) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/rsu/configs/${ip}/${port}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting RSU ${ip}:${port}:`, error);
      throw error;
    }
  },

  /**
   * Get RSU status information
   * @returns {Promise} Array of RSU status objects
   */
  getRSUStatuses: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/rsu/status`);
      return response.data;
    } catch (error) {
      console.error('Error fetching RSU statuses:', error);
      throw error;
    }
  },

  /**
   * Get RSU status by IP and port
   * @param {string} ip - RSU IP address
   * @param {number} port - RSU port
   * @returns {Promise} RSU status object
   */
  getRSUStatusById: async (ip, port) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/rsu/status/${ip}/${port}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching RSU status for ${ip}:${port}:`, error);
      throw error;
    }
  },

  /**
   * Get RSU topics configuration
   * @param {string} ip - RSU IP address
   * @param {number} port - RSU port
   * @returns {Promise} RSUTopicsMessage
   */
  getRSUTopics: async (ip, port) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/rsu/topics/${ip}/${port}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching RSU topics for ${ip}:${port}:`, error);
      throw error;
    }
  },

  /**
   * Update RSU topics configuration
   * @param {string} ip - RSU IP address
   * @param {number} port - RSU port
   * @param {Object} topicsData - RSUTopicsMessage data
   * @returns {Promise}
   */
  updateRSUTopics: async (ip, port, topicsData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/rsu/topics/${ip}/${port}`, topicsData);
      return response.data;
    } catch (error) {
      console.error(`Error updating RSU topics for ${ip}:${port}:`, error);
      throw error;
    }
  },
};

export default rsuService;
