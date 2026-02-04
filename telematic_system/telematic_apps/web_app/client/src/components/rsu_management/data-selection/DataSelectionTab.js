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

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Alert,
  Snackbar,
  Paper,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Button from '../../../layout/Button';
import TRUSelector from './components/TRUSelector';
import RSUSelector from './components/RSUSelector';
import DataTypeFilter from './components/DataTypeFilter';
import TopicSelectionList from './components/TopicSelectionList';
import useTopicConfiguration from '../hooks/useTopicConfiguration';

/**
 * Data Selection Tab Component
 * Main entry point for the Data Selection pipeline
 */
const DataSelectionTab = () => {
  const {
    selectedTRU,
    selectedRSU,
    dataTypeFilter,
    filteredTopics,
    loading,
    error,
    getTRUList,
    getRSUList,
    handleSelectTRU,
    handleSelectRSU,
    handleToggleTopic,
    handleSelectAll,
    handleClearAll,
    isTopicSelected,
    handleDataTypeFilterChange,
    getSelectionSummary,
    handleSave,
    resetSelection,
  } = useTopicConfiguration();

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const summary = getSelectionSummary();
  const selectedTopics = filteredTopics
    .filter(topic => isTopicSelected(topic.name))
    .map(topic => topic.name);

  const steps = ['Select TRU', 'Select RSU', 'Filter Topics', 'Select Topics'];

  const getActiveStep = () => {
    if (!selectedTRU) return 0;
    if (!selectedRSU) return 1;
    if (dataTypeFilter === 'all' && filteredTopics.length > 0) return 2;
    return 3;
  };

  const handleSaveConfiguration = async () => {
    const result = await handleSave();
    
    if (result.success) {
      setSnackbar({
        open: true,
        message: 'Topic configuration saved successfully!',
        severity: 'success',
      });
    } else {
      setSnackbar({
        open: true,
        message: `Failed to save: ${result.error}`,
        severity: 'error',
      });
    }
  };

  const handleReset = () => {
    resetSelection();
    setSnackbar({
      open: true,
      message: 'Selection reset',
      severity: 'info',
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleSelectAllFiltered = () => {
    const topicNames = filteredTopics.map(t => t.name);
    handleSelectAll(topicNames);
  };

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h5" gutterBottom>
          Data Selection Pipeline
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Select a TRU, then an RSU, and choose which topics to monitor
        </Typography>
      </Box>

      {/* Progress Stepper */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Stepper activeStep={getActiveStep()} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Selection Summary */}
      {summary.truSelected && (
        <Paper elevation={1} sx={{ p: 2, mb: 3, backgroundColor: 'info.light' }}>
          <Typography variant="body2">
            <strong>Selected TRU:</strong> {selectedTRU}
            {summary.rsuSelected && (
              <>
                {' | '}
                <strong>Selected RSU:</strong> {selectedRSU.ip}:{selectedRSU.port}
              </>
            )}
            {summary.topicCount > 0 && (
              <>
                {' | '}
                <strong>Topics Selected:</strong> {summary.topicCount} of {summary.availableTopicCount}
              </>
            )}
          </Typography>
        </Paper>
      )}

      {/* Main Grid Layout */}
      <Grid container spacing={3}>
        {/* Column 1: TRU Selector */}
        <Grid item xs={12} md={3}>
          <TRUSelector
            truList={getTRUList()}
            selectedTRU={selectedTRU}
            onSelect={handleSelectTRU}
          />
        </Grid>

        {/* Column 2: RSU Selector */}
        <Grid item xs={12} md={3}>
          <RSUSelector
            rsuList={getRSUList()}
            selectedRSU={selectedRSU}
            onSelect={handleSelectRSU}
            disabled={!selectedTRU}
          />
        </Grid>

        {/* Column 3: Data Type Filter */}
        <Grid item xs={12} md={3}>
          <DataTypeFilter
            value={dataTypeFilter}
            onChange={handleDataTypeFilterChange}
            disabled={!selectedRSU}
          />
        </Grid>

        {/* Column 4: Topic Selection List */}
        <Grid item xs={12} md={3}>
          <TopicSelectionList
            topics={filteredTopics}
            selectedTopics={selectedTopics}
            onToggle={handleToggleTopic}
            onSelectAll={handleSelectAllFiltered}
            onClearAll={handleClearAll}
            disabled={!selectedRSU}
          />
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
        <Button
          variant="outlined"
          startIcon={<RestartAltIcon />}
          onClick={handleReset}
          disabled={!selectedTRU}
        >
          Reset Selection
        </Button>
        <Button
          startIcon={<SaveIcon />}
          onClick={handleSaveConfiguration}
          disabled={!selectedRSU || summary.topicCount === 0 || loading}
        >
          {loading ? 'Saving...' : 'Save Configuration'}
        </Button>
      </Box>

      {/* Snackbar Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DataSelectionTab;
