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

import ClearAllIcon from '@mui/icons-material/ClearAll';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import TopicIcon from '@mui/icons-material/Topic';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

/**
 * Topic Selection List Component
 * Displays available topics grouped by RSU and allows selection
 */
const TopicSelectionList = ({
  topicsByRSU = [],
  selectedTopics = {},
  onToggle,
  onSelectAll,
  onClearAll,
  disabled,
}) => {
  const isTopicSelected = (rsuKey, topicName) => {
    return selectedTopics[rsuKey]?.includes(topicName) || false;
  };

  const getSelectionSummary = () => {
    const totalSelected = Object.values(selectedTopics).reduce(
      (sum, topics) => sum + topics.length,
      0
    );
    const totalAvailable = topicsByRSU.reduce(
      (sum, rsuGroup) => sum + rsuGroup.topics.length,
      0
    );
    return `${totalSelected} of ${totalAvailable} selected`;
  };

  const getRSUSelectionCount = (rsuKey) => {
    const rsuGroup = topicsByRSU.find(g => g.rsuKey === rsuKey);
    const selected = selectedTopics[rsuKey]?.length || 0;
    const total = rsuGroup?.topics.length || 0;
    return { selected, total };
  };

  const handleSelectAllForRSU = (rsuKey) => {
    const rsuGroup = topicsByRSU.find(g => g.rsuKey === rsuKey);
    if (rsuGroup) {
      const topicNames = rsuGroup.topics.map(t => t.name);
      onSelectAll({ [rsuKey]: topicNames });
    }
  };

  const handleClearAllForRSU = (rsuKey) => {
    onSelectAll({ [rsuKey]: [] });
  };

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TopicIcon sx={{ color: '#748c93' }} />
          Select Data Types
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {getSelectionSummary()}
        </Typography>
      </Box>

      {/* Global Action Buttons */}
      {!disabled && topicsByRSU.length > 0 && (
        <>
          <Stack direction="row" spacing={1} mb={2}>
            <Button
              size="small"
              startIcon={<SelectAllIcon />}
              sx={{ 
                border: '1px solid #748c93',
                color: 'black',
                '&:hover': { backgroundColor: '#5f7379' }
              }}
              onClick={() => {
                const allTopics = {};
                topicsByRSU.forEach(rsuGroup => {
                  allTopics[rsuGroup.rsuKey] = rsuGroup.topics.map(t => t.name);
                });
                onSelectAll(allTopics);
              }}
            >
              Select All
            </Button>
            <Button
              size="small"
              startIcon={<ClearAllIcon />}
              sx={{ 
                border: '1px solid #748c93',
                color: 'black',
                '&:hover': { backgroundColor: '#5f7379' }
              }}
              onClick={onClearAll}
              disabled={Object.keys(selectedTopics).length === 0}
            >
              Clear All
            </Button>
          </Stack>
          <Divider sx={{ mb: 2 }} />
        </>
      )}

      {/* Data Types List Grouped by RSU */}
      {disabled ? (
        <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
          Please select TRU and RSU(s) to view available data types
        </Typography>
      ) : topicsByRSU.length === 0 ? (
        <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
          No topics available for the selected RSU(s)
        </Typography>
      ) : (
        <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
          {topicsByRSU.map((rsuGroup) => {
            const { selected, total } = getRSUSelectionCount(rsuGroup.rsuKey);
            
            return (
              <Accordion key={rsuGroup.rsuKey} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                    <Typography variant="subtitle2">
                      {rsuGroup.rsuKey}
                    </Typography>
                    <Chip
                      label={`${selected}/${total}`}
                      size="small"
                      sx={{ 
                        mr: 2,
                        backgroundColor: selected > 0 ? '#748c93' : undefined,
                        color: selected > 0 ? 'white' : undefined
                      }}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {/* RSU-specific action buttons */}
                  <Stack direction="row" spacing={1} mb={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ 
                        borderColor: '#748c93',
                        color: '#748c93',
                        '&:hover': { borderColor: '#5f7379', backgroundColor: 'rgba(116, 140, 147, 0.04)' }
                      }}
                      onClick={() => handleSelectAllForRSU(rsuGroup.rsuKey)}
                      disabled={selected === total}
                    >
                      Select All
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ 
                        borderColor: '#748c93',
                        color: '#748c93',
                        '&:hover': { borderColor: '#5f7379', backgroundColor: 'rgba(116, 140, 147, 0.04)' }
                      }}
                      onClick={() => handleClearAllForRSU(rsuGroup.rsuKey)}
                      disabled={selected === 0}
                    >
                      Clear
                    </Button>
                  </Stack>
                  
                  <List dense>
                    {rsuGroup.topics.map((topic) => {
                      const labelId = `topic-list-label-${rsuGroup.rsuKey}-${topic.name}`;
                      const isSelected = isTopicSelected(rsuGroup.rsuKey, topic.name);

                      return (
                        <ListItem key={topic.name} disablePadding dense>
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              checked={isSelected}
                              tabIndex={-1}
                              disableRipple
                              inputProps={{ 'aria-labelledby': labelId }}
                              onChange={() => onToggle(rsuGroup.rsuKey, topic.name)}
                            />
                          </ListItemIcon>
                          <ListItemText
                            id={labelId}
                            primary={topic.name}
                            secondary={isSelected ? 'Selected' : 'Not selected'}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}
    </Paper>
  );
};

export default TopicSelectionList;
