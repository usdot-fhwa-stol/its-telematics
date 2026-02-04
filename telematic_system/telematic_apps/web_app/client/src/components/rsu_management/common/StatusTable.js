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

import {
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import StatusBadge from './StatusBadge';

/**
 * Generic Status Table Component
 * Used by both RSU and TRU status tabs
 */
const StatusTable = ({
  data,
  columns,
  loading,
  onRowClick,
  emptyMessage = 'No data available',
}) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography variant="body1" color="textSecondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  /**
   * Render cell content based on column configuration
   */
  const renderCellContent = (row, column) => {
    if (column.render) {
      return column.render(row);
    }

    const value = row[column.field];

    // Handle status badge
    if (column.field === 'online' || column.field === 'status') {
      return <StatusBadge online={value} />;
    }

    // Handle timestamp
    if (column.type === 'timestamp' && value) {
      return new Date(value).toLocaleString();
    }

    // Handle array
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    // Handle null/undefined
    if (value === null || value === undefined) {
      return '-';
    }

    return value;
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.field}
                align={column.align || 'left'}
                sx={{ fontWeight: 'bold', backgroundColor: 'primary.light', color: 'white' }}
              >
                {column.headerName}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <TableRow
              key={row.id || index}
              hover={!!onRowClick}
              onClick={() => onRowClick && onRowClick(row)}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                '&:hover': {
                  backgroundColor: onRowClick ? 'action.hover' : 'transparent',
                },
              }}
            >
              {columns.map((column) => (
                <TableCell key={column.field} align={column.align || 'left'}>
                  {renderCellContent(row, column)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default StatusTable;
