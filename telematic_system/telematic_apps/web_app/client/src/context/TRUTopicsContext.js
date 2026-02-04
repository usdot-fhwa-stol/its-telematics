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

import React, { createContext, useContext, useState, useCallback } from 'react';
import rsuService from '../api/rsuService';

const TRUTopicsContext = createContext();

// Dummy data for local testing
const DUMMY_TRU_TOPICS = [
  {
    unitId: 'TRU-001',
    rsuTopics: [
      {
        rsu: { ip: '192.168.1.100', port: 1516 },
        topics: [
          { name: 'bsm', selected: true },
          { name: 'tim', selected: true },
          { name: 'spat', selected: false },
          { name: 'map', selected: true },
          { name: 'psm', selected: false },
          { name: 'srm', selected: false },
          { name: 'ssm', selected: false }
        ]
      },
      {
        rsu: { ip: '192.168.1.101', port: 1516 },
        topics: [
          { name: 'bsm', selected: true },
          { name: 'tim', selected: false },
          { name: 'spat', selected: true },
          { name: 'map', selected: true },
          { name: 'psm', selected: true },
          { name: 'srm', selected: false },
          { name: 'ssm', selected: false }
        ]
      }
    ],
    timestamp: Date.now()
  },
  {
    unitId: 'TRU-002',
    rsuTopics: [
      {
        rsu: { ip: '192.168.2.100', port: 1516 },
        topics: [
          { name: 'bsm', selected: true },
          { name: 'tim', selected: true },
          { name: 'spat', selected: true },
          { name: 'map', selected: false },
          { name: 'psm', selected: false },
          { name: 'srm', selected: true },
          { name: 'ssm', selected: true }
        ]
      },
      {
        rsu: { ip: '192.168.2.101', port: 1516 },
        topics: [
          { name: 'bsm', selected: true },
          { name: 'tim', selected: false },
          { name: 'spat', selected: false },
          { name: 'map', selected: true },
          { name: 'psm', selected: false },
          { name: 'srm', selected: false },
          { name: 'ssm', selected: false }
        ]
      },
      {
        rsu: { ip: '192.168.2.102', port: 1516 },
        topics: [
          { name: 'bsm', selected: true },
          { name: 'tim', selected: true },
          { name: 'spat', selected: false },
          { name: 'map', selected: false },
          { name: 'psm', selected: true },
          { name: 'srm', selected: false },
          { name: 'ssm', selected: false }
        ]
      }
    ],
    timestamp: Date.now()
  },
  {
    unitId: 'TRU-003',
    rsuTopics: [
      {
        rsu: { ip: '192.168.3.100', port: 1516 },
        topics: [
          { name: 'bsm', selected: false },
          { name: 'tim', selected: false },
          { name: 'spat', selected: true },
          { name: 'map', selected: true },
          { name: 'psm', selected: false },
          { name: 'srm', selected: false },
          { name: 'ssm', selected: false }
        ]
      }
    ],
    timestamp: Date.now()
  }
];

/**
 * Context provider for TRU Topics management
 * Manages topic selection and configuration for TRUs and their associated RSUs
 */
export const TRUTopicsProvider = ({ children }) => {
  const [truTopics, setTruTopics] = useState([]);
  const [selectedTRU, setSelectedTRU] = useState(null);
  const [selectedRSU, setSelectedRSU] = useState(null);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch all TRU topics
   */
  const fetchTRUTopics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use dummy data for local testing
      // Uncomment below to use real API:
      // const topics = await rsuService.getTRUTopics();
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      const topics = DUMMY_TRU_TOPICS;
      setTruTopics(topics);
    } catch (err) {
      setError(err.message || 'Failed to fetch TRU topics');
      console.error('Error fetching TRU topics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch TRU topics by unit ID
   */
  const fetchTRUTopicsById = useCallback(async (unitId) => {
    setLoading(true);
    setError(null);
    try {
      // Use dummy data for local testing
      // Uncomment below to use real API:
      // const topics = await rsuService.getTRUTopicsById(unitId);
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
      const topics = DUMMY_TRU_TOPICS.find(t => t.unitId === unitId);
      return topics;
    } catch (err) {
      setError(err.message || `Failed to fetch TRU topics for ${unitId}`);
      console.error(`Error fetching TRU topics for ${unitId}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update TRU topics configuration
   */
  const updateTRUTopics = useCallback(async (unitId, topicsData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await rsuService.updateTRUTopics(unitId, topicsData);
      // Refresh topics list
      await fetchTRUTopics();
      return result;
    } catch (err) {
      setError(err.message || `Failed to update TRU topics for ${unitId}`);
      console.error(`Error updating TRU topics for ${unitId}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTRUTopics]);

  /**
   * Fetch RSU topics for a specific RSU
   */
  const fetchRSUTopics = useCallback(async (ip, port) => {
    setLoading(true);
    setError(null);
    try {
      const topics = await rsuService.getRSUTopics(ip, port);
      return topics;
    } catch (err) {
      setError(err.message || `Failed to fetch RSU topics for ${ip}:${port}`);
      console.error(`Error fetching RSU topics for ${ip}:${port}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update RSU topics configuration
   */
  const updateRSUTopics = useCallback(async (ip, port, topicsData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await rsuService.updateRSUTopics(ip, port, topicsData);
      return result;
    } catch (err) {
      setError(err.message || `Failed to update RSU topics for ${ip}:${port}`);
      console.error(`Error updating RSU topics for ${ip}:${port}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Select a TRU for topic configuration
   */
  const selectTRU = useCallback(async (unitId) => {
    setSelectedTRU(unitId);
    setSelectedRSU(null);
    setSelectedTopics([]);
    
    if (unitId) {
      try {
        const topics = await fetchTRUTopicsById(unitId);
        // Initialize selected topics based on current configuration
        if (topics && topics.rsuTopics) {
          const allTopics = topics.rsuTopics.flatMap(rsuTopic => 
            rsuTopic.topics.filter(t => t.selected)
          );
          setSelectedTopics(allTopics.map(t => t.name));
        }
      } catch (err) {
        console.error(`Error loading topics for TRU ${unitId}:`, err);
      }
    }
  }, [fetchTRUTopicsById]);

  /**
   * Select an RSU within the selected TRU
   */
  const selectRSU = useCallback(async (rsuEndpoint) => {
    setSelectedRSU(rsuEndpoint);
    setSelectedTopics([]);
    
    if (rsuEndpoint) {
      try {
        const topics = await fetchRSUTopics(rsuEndpoint.ip, rsuEndpoint.port);
        // Initialize selected topics for this RSU
        if (topics && topics.topics) {
          const selected = topics.topics.filter(t => t.selected);
          setSelectedTopics(selected.map(t => t.name));
        }
      } catch (err) {
        console.error(`Error loading topics for RSU ${rsuEndpoint.ip}:${rsuEndpoint.port}:`, err);
      }
    }
  }, [fetchRSUTopics]);

  /**
   * Toggle topic selection
   */
  const toggleTopic = useCallback((topicName) => {
    setSelectedTopics(prev => {
      if (prev.includes(topicName)) {
        return prev.filter(t => t !== topicName);
      } else {
        return [...prev, topicName];
      }
    });
  }, []);

  /**
   * Select all topics
   */
  const selectAllTopics = useCallback((topicNames) => {
    setSelectedTopics(topicNames);
  }, []);

  /**
   * Clear all topic selections
   */
  const clearAllTopics = useCallback(() => {
    setSelectedTopics([]);
  }, []);

  /**
   * Get RSU list for selected TRU
   */
  const getRSUListForSelectedTRU = useCallback(() => {
    if (!selectedTRU) return [];
    
    const truData = truTopics.find(t => t.unitId === selectedTRU);
    return truData?.rsuTopics?.map(rt => rt.rsu) || [];
  }, [selectedTRU, truTopics]);

  /**
   * Get available topics for selected RSU
   */
  const getTopicsForSelectedRSU = useCallback(() => {
    if (!selectedTRU || !selectedRSU) return [];
    
    const truData = truTopics.find(t => t.unitId === selectedTRU);
    const rsuData = truData?.rsuTopics?.find(
      rt => rt.rsu.ip === selectedRSU.ip && rt.rsu.port === selectedRSU.port
    );
    
    return rsuData?.topics || [];
  }, [selectedTRU, selectedRSU, truTopics]);

  /**
   * Save topic configuration
   */
  const saveTopicConfiguration = useCallback(async () => {
    if (!selectedTRU) {
      throw new Error('No TRU selected');
    }

    const truData = truTopics.find(t => t.unitId === selectedTRU);
    if (!truData) {
      throw new Error('TRU data not found');
    }

    // Build updated topics data
    const updatedRsuTopics = truData.rsuTopics.map(rsuTopic => ({
      ...rsuTopic,
      topics: rsuTopic.topics.map(topic => ({
        ...topic,
        selected: selectedTopics.includes(topic.name)
      }))
    }));

    const updatedData = {
      unitId: selectedTRU,
      rsuTopics: updatedRsuTopics,
      timestamp: Date.now()
    };

    return await updateTRUTopics(selectedTRU, updatedData);
  }, [selectedTRU, selectedTopics, truTopics, updateTRUTopics]);

  const value = {
    truTopics,
    selectedTRU,
    selectedRSU,
    selectedTopics,
    loading,
    error,
    fetchTRUTopics,
    fetchTRUTopicsById,
    updateTRUTopics,
    fetchRSUTopics,
    updateRSUTopics,
    selectTRU,
    selectRSU,
    toggleTopic,
    selectAllTopics,
    clearAllTopics,
    getRSUListForSelectedTRU,
    getTopicsForSelectedRSU,
    saveTopicConfiguration,
  };

  return <TRUTopicsContext.Provider value={value}>{children}</TRUTopicsContext.Provider>;
};

/**
 * Custom hook to use TRU Topics context
 */
export const useTRUTopics = () => {
  const context = useContext(TRUTopicsContext);
  if (!context) {
    throw new Error('useTRUTopics must be used within a TRUTopicsProvider');
  }
  return context;
};

export default TRUTopicsContext;
