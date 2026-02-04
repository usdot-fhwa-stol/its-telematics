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

import { useState, useCallback, useEffect } from 'react';
import { useTRUTopics } from '../../../context/TRUTopicsContext';

/**
 * Custom hook for managing topic configuration
 * Handles the data selection pipeline for TRU/RSU topics
 */
const useTopicConfiguration = () => {
  const {
    truTopics,
    selectedTRU,
    selectedRSU,
    selectedTopics,
    loading,
    error,
    selectTRU,
    selectRSU,
    toggleTopic,
    selectAllTopics,
    clearAllTopics,
    getRSUListForSelectedTRU,
    getTopicsForSelectedRSU,
    saveTopicConfiguration,
    fetchTRUTopics,
  } = useTRUTopics();

  const [dataTypeFilter, setDataTypeFilter] = useState('all');
  const [availableTopics, setAvailableTopics] = useState([]);
  const [filteredTopics, setFilteredTopics] = useState([]);

  /**
   * Initialize - fetch TRU topics on mount
   */
  useEffect(() => {
    fetchTRUTopics();
  }, [fetchTRUTopics]);

  /**
   * Update available topics when RSU selection changes
   */
  useEffect(() => {
    const topics = getTopicsForSelectedRSU();
    setAvailableTopics(topics);
    setFilteredTopics(topics);
  }, [selectedRSU, getTopicsForSelectedRSU]);

  /**
   * Apply data type filter
   */
  useEffect(() => {
    if (dataTypeFilter === 'all') {
      setFilteredTopics(availableTopics);
    } else {
      const filtered = availableTopics.filter(topic => 
        topic.name.toLowerCase().includes(dataTypeFilter.toLowerCase())
      );
      setFilteredTopics(filtered);
    }
  }, [dataTypeFilter, availableTopics]);

  /**
   * Handle TRU selection
   */
  const handleSelectTRU = useCallback(async (unitId) => {
    await selectTRU(unitId);
  }, [selectTRU]);

  /**
   * Handle RSU selection
   */
  const handleSelectRSU = useCallback(async (rsuEndpoint) => {
    await selectRSU(rsuEndpoint);
  }, [selectRSU]);

  /**
   * Handle topic toggle
   */
  const handleToggleTopic = useCallback((topicName) => {
    toggleTopic(topicName);
  }, [toggleTopic]);

  /**
   * Handle select all topics
   */
  const handleSelectAll = useCallback(() => {
    const topicNames = filteredTopics.map(t => t.name);
    selectAllTopics(topicNames);
  }, [filteredTopics, selectAllTopics]);

  /**
   * Handle clear all topics
   */
  const handleClearAll = useCallback(() => {
    clearAllTopics();
  }, [clearAllTopics]);

  /**
   * Handle data type filter change
   */
  const handleDataTypeFilterChange = useCallback((filterType) => {
    setDataTypeFilter(filterType);
  }, []);

  /**
   * Get TRU list for selection
   */
  const getTRUList = useCallback(() => {
    return truTopics.map(t => ({
      unitId: t.unitId,
      name: t.unitId,
      rsuCount: t.rsuTopics?.length || 0
    }));
  }, [truTopics]);

  /**
   * Get RSU list for selected TRU
   */
  const getRSUList = useCallback(() => {
    return getRSUListForSelectedTRU();
  }, [getRSUListForSelectedTRU]);

  /**
   * Check if topic is selected
   */
  const isTopicSelected = useCallback((topicName) => {
    return selectedTopics.includes(topicName);
  }, [selectedTopics]);

  /**
   * Get selection summary
   */
  const getSelectionSummary = useCallback(() => {
    return {
      truSelected: !!selectedTRU,
      rsuSelected: !!selectedRSU,
      topicCount: selectedTopics.length,
      availableTopicCount: filteredTopics.length,
    };
  }, [selectedTRU, selectedRSU, selectedTopics, filteredTopics]);

  /**
   * Save configuration
   */
  const handleSave = useCallback(async () => {
    try {
      await saveTopicConfiguration();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [saveTopicConfiguration]);

  /**
   * Reset selection
   */
  const resetSelection = useCallback(() => {
    selectTRU(null);
    setDataTypeFilter('all');
  }, [selectTRU]);

  return {
    // State
    selectedTRU,
    selectedRSU,
    selectedTopics,
    dataTypeFilter,
    filteredTopics,
    loading,
    error,
    
    // TRU/RSU selection
    getTRUList,
    getRSUList,
    handleSelectTRU,
    handleSelectRSU,
    
    // Topic selection
    handleToggleTopic,
    handleSelectAll,
    handleClearAll,
    isTopicSelected,
    
    // Filtering
    handleDataTypeFilterChange,
    
    // Summary and actions
    getSelectionSummary,
    handleSave,
    resetSelection,
  };
};

export default useTopicConfiguration;
