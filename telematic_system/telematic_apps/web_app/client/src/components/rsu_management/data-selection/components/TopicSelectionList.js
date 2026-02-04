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

import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Paper,
  Button,
  Stack,
  Divider,
} from '@mui/material';
import TopicIcon from '@mui/icons-material/Topic';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import ClearAllIcon from '@mui/icons-material/ClearAll';

/**
 * Topic Selection List Component
 * Displays available topics and allows selection
 */
const TopicSelectionList = ({
  topics,
  selectedTopics,
  onToggle,
  onSelectAll,
  onClearAll,
  disabled,
}) => {
  const isTopicSelected = (topicName) => {
    return selectedTopics.includes(topicName);
  };

  const getSelectionSummary = () => {
    const selected = selectedTopics.length;
    const total = topics.length;
    return `${selected} of ${total} selected`;
  };

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TopicIcon color="primary" />
          Select Topics
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {getSelectionSummary()}
        </Typography>
      </Box>

      {/* Action Buttons */}
      {!disabled && topics.length > 0 && (
        <>
          <Stack direction="row" spacing={1} mb={2}>
            <Button
              size="small"
              startIcon={<SelectAllIcon />}
              onClick={onSelectAll}
              disabled={selectedTopics.length === topics.length}
            >
              Select All
            </Button>
            <Button
              size="small"
              startIcon={<ClearAllIcon />}
              onClick={onClearAll}
              disabled={selectedTopics.length === 0}
            >
              Clear All
            </Button>
          </Stack>
          <Divider sx={{ mb: 2 }} />
        </>
      )}

      {/* Topics List */}
      {disabled ? (
        <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
          Please select TRU and RSU to view available topics
        </Typography>
      ) : topics.length === 0 ? (
        <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
          No topics available for the selected RSU
        </Typography>
      ) : (
        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
          {topics.map((topic) => {
            const labelId = `topic-list-label-${topic.name}`;
            const isSelected = isTopicSelected(topic.name);

            return (
              <ListItem
                key={topic.name}
                disablePadding
                dense
              >
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={isSelected}
                    tabIndex={-1}
                    disableRipple
                    inputProps={{ 'aria-labelledby': labelId }}
                    onChange={() => onToggle(topic.name)}
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
      )}
    </Paper>
  );
};

export default TopicSelectionList;
