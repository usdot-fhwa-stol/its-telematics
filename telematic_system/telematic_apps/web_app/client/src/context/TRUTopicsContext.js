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

import { createContext, useCallback, useContext, useState } from 'react';
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
  const [selectedRSUs, setSelectedRSUs] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState({});
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
    setSelectedRSUs([]);
    setSelectedTopics({});
    
    if (unitId) {
      try {
        const topics = await fetchTRUTopicsById(unitId);
        // Initialize selected topics based on current configuration
        if (topics && topics.rsuTopics) {
          const topicsByRSU = {};
          topics.rsuTopics.forEach(rsuTopic => {
            const rsuKey = `${rsuTopic.rsu.ip}:${rsuTopic.rsu.port}`;
            topicsByRSU[rsuKey] = rsuTopic.topics
              .filter(t => t.selected)
              .map(t => t.name);
          });
          setSelectedTopics(topicsByRSU);
        }
      } catch (err) {
        console.error(`Error loading topics for TRU ${unitId}:`, err);
      }
    }
  }, [fetchTRUTopicsById]);

  /**
   * Select RSUs within the selected TRU
   */
  const selectRSUs = useCallback(async (rsuEndpoints) => {
    setSelectedRSUs(rsuEndpoints);
    
    // Preserve existing selections and only add default selections for newly added RSUs
    setSelectedTopics(prev => {
      const newSelectedTopics = { ...prev };
      
      // Get list of new RSU keys
      const newRsuKeys = rsuEndpoints.map(ep => `${ep.ip}:${ep.port}`);
      
      // Remove selections for RSUs that are no longer selected
      Object.keys(newSelectedTopics).forEach(rsuKey => {
        if (!newRsuKeys.includes(rsuKey)) {
          delete newSelectedTopics[rsuKey];
        }
      });
      
      // Add default selections only for newly added RSUs
      for (const rsuEndpoint of rsuEndpoints) {
        const rsuKey = `${rsuEndpoint.ip}:${rsuEndpoint.port}`;
        
        // Skip if this RSU already has selections (preserve user's choices)
        if (newSelectedTopics[rsuKey]) {
          continue;
        }
        
        // Initialize with default selections for new RSUs
        try {
          if (selectedTRU) {
            const truData = truTopics.find(t => t.unitId === selectedTRU);
            if (truData) {
              const rsuData = truData.rsuTopics?.find(rt => 
                rt.rsu.ip === rsuEndpoint.ip && rt.rsu.port === rsuEndpoint.port
              );
              if (rsuData) {
                newSelectedTopics[rsuKey] = rsuData.topics
                  .filter(t => t.selected)
                  .map(t => t.name);
              }
            }
          }
        } catch (err) {
          console.error(`Error loading topics for RSU ${rsuEndpoint.ip}:${rsuEndpoint.port}:`, err);
          newSelectedTopics[rsuKey] = [];
        }
      }
      
      return newSelectedTopics;
    });
  }, [selectedTRU, truTopics]);

  /**
   * Toggle topic selection for a specific RSU
   */
  const toggleTopic = useCallback((rsuKey, topicName) => {
    setSelectedTopics(prev => {
      const rsuTopics = prev[rsuKey] || [];
      const newRsuTopics = rsuTopics.includes(topicName)
        ? rsuTopics.filter(t => t !== topicName)
        : [...rsuTopics, topicName];
      
      return {
        ...prev,
        [rsuKey]: newRsuTopics
      };
    });
  }, []);

  /**
   * Select all topics for specific RSUs
   */
  const selectAllTopics = useCallback((rsuTopicsMap) => {
    setSelectedTopics(prev => ({
      ...prev,
      ...rsuTopicsMap
    }));
  }, []);

  /**
   * Clear all topic selections for all RSUs
   */
  const clearAllTopics = useCallback(() => {
    setSelectedTopics({});
  }, []);

  /**
   * Clear topics for specific RSUs
   */
  const clearTopicsForRSUs = useCallback((rsuKeys) => {
    setSelectedTopics(prev => {
      const newTopics = { ...prev };
      rsuKeys.forEach(key => {
        delete newTopics[key];
      });
      return newTopics;
    });
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
   * Get available topics for selected RSUs grouped by RSU
   */
  const getTopicsForSelectedRSUs = useCallback(() => {
    if (!selectedTRU || selectedRSUs.length === 0) return [];
    
    const truData = truTopics.find(t => t.unitId === selectedTRU);
    if (!truData) return [];

    return selectedRSUs.map(rsu => {
      const rsuData = truData.rsuTopics?.find(
        rt => rt.rsu.ip === rsu.ip && rt.rsu.port === rsu.port
      );
      
      return {
        rsu,
        rsuKey: `${rsu.ip}:${rsu.port}`,
        topics: rsuData?.topics || []
      };
    });
  }, [selectedTRU, selectedRSUs, truTopics]);

  /**
   * Get available topics for selected RSU (legacy single RSU support)
   */
  const getTopicsForSelectedRSU = useCallback(() => {
    if (!selectedTRU || selectedRSUs.length === 0) return [];
    
    const truData = truTopics.find(t => t.unitId === selectedTRU);
    const rsuData = truData?.rsuTopics?.find(
      rt => rt.rsu.ip === selectedRSUs[0]?.ip && rt.rsu.port === selectedRSUs[0]?.port
    );
    
    return rsuData?.topics || [];
  }, [selectedTRU, selectedRSUs, truTopics]);

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
    const updatedRsuTopics = truData.rsuTopics.map(rsuTopic => {
      const rsuKey = `${rsuTopic.rsu.ip}:${rsuTopic.rsu.port}`;
      const selectedForRSU = selectedTopics[rsuKey] || [];
      
      return {
        ...rsuTopic,
        topics: rsuTopic.topics.map(topic => ({
          ...topic,
          selected: selectedForRSU.includes(topic.name)
        }))
      };
    });

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
    selectedRSUs,
    selectedTopics,
    loading,
    error,
    fetchTRUTopics,
    fetchTRUTopicsById,
    updateTRUTopics,
    fetchRSUTopics,
    updateRSUTopics,
    selectTRU,
    selectRSUs,
    toggleTopic,
    selectAllTopics,
    clearAllTopics,
    clearTopicsForRSUs,
    getRSUListForSelectedTRU,
    getTopicsForSelectedRSU,
    getTopicsForSelectedRSUs,
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
