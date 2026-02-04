# RSU Management Module

## Overview

The RSU Management module provides a comprehensive user interface for managing Roadside Units (RSUs) and Telematic Roadside Units (TRUs) within the telematic system. It features three main functional areas organized as tabs:

1. **RSU Status** - Manage and monitor RSU configurations
2. **TRU Status** - Monitor TRU configurations and status
3. **Data Selection** - Configure topic subscriptions for data collection

## Architecture

### Folder Structure

```
src/
├── api/
│   └── rsuService.js                  # API layer for all RSU/TRU operations
├── context/
│   ├── TRUStatusContext.js            # Global state for TRU status
│   └── TRUTopicsContext.js            # Global state for TRU topics
├── components/
│   ├── layout/
│   │   ├── Button.js                  # Reusable button component
│   │   └── Navbar.js                  # Navigation bar
│   └── rsu_management/
│       ├── common/                     # Shared components
│       │   ├── RSUManagementLayout.js # Main layout with tabs
│       │   ├── StatusTable.js         # Generic table component
│       │   ├── StatusBadge.js         # Status indicator
│       │   └── ManagementDialog.js    # Base dialog wrapper
│       ├── rsu-status/                # RSU Status tab
│       │   ├── components/
│       │   │   ├── RSUFilters.js
│       │   │   ├── RegisterRSUDialog.js
│       │   │   ├── EditRSUDialog.js
│       │   │   └── DeleteRSUAlert.js
│       │   └── RSUStatusTab.js
│       ├── tru-status/                # TRU Status tab
│       │   ├── components/
│       │   │   └── TRUFilters.js
│       │   └── TRUStatusTab.js
│       ├── data-selection/            # Data Selection tab
│       │   ├── components/
│       │   │   ├── TRUSelector.js
│       │   │   ├── RSUSelector.js
│       │   │   ├── DataTypeFilter.js
│       │   │   └── TopicSelectionList.js
│       │   └── DataSelectionTab.js
│       └── hooks/                     # Custom hooks
│           ├── useHardwareStatus.js
│           └── useTopicConfiguration.js
└── App.js
```

## Components

### API Layer

**rsuService.js**
- Centralized API client for all RSU/TRU operations
- Methods for CRUD operations on RSU configurations
- Methods for fetching TRU configs, status, and topics
- Proper error handling and response formatting

### Context Providers

**TRUStatusContext.js**
- Manages global state for TRU configurations and statuses
- Provides methods for fetching and updating TRU data
- Combines configuration and status information
- Includes filtering capabilities

**TRUTopicsContext.js**
- Manages topic selection and configuration
- Handles TRU and RSU selection state
- Provides methods for topic manipulation
- Saves topic configuration changes

### Custom Hooks

**useHardwareStatus.js**
- Generic hook for RSU/TRU status management
- Supports filtering by search and online/offline status
- Provides online/offline counts
- Handles data refresh

**useTopicConfiguration.js**
- Manages the data selection pipeline
- Handles TRU → RSU → Topic selection flow
- Supports data type filtering
- Provides save and reset functionality

### Tab Components

#### RSU Status Tab
- Display all RSUs in a filterable table
- Register new RSUs with IP and port
- Edit existing RSU configurations
- Delete RSUs with confirmation
- Real-time status indicators (online/offline)

#### TRU Status Tab
- Monitor TRU status and configurations
- View RSU count per TRU
- Filter by search term and status
- View last seen timestamps

#### Data Selection Tab
- 4-step pipeline for topic configuration
- Step 1: Select TRU
- Step 2: Select RSU within TRU
- Step 3: Filter topics by data type
- Step 4: Select/deselect individual topics
- Visual progress stepper
- Save configuration to backend

## Data Models

The UI uses the following data models from the server:

### TRUTopicsMessage
```typescript
{
  unitId: string;
  rsuTopics: RSUTopicsMessage[];
  timestamp?: number;
}
```

### TRUConfigMessage
```typescript
{
  unitConfig: UnitConfig;
  rsuConfigs: RsuConfigItemMessage[];
  timestamp?: number;
}
```

### RSUTopicsMessage
```typescript
{
  topics: TopicMessage[];
  rsu: RSUEndpoint;
}
```

### RSUEndpoint
```typescript
{
  ip: string;
  port: number;
}
```

### TopicMessage
```typescript
{
  name: string;
  selected: boolean;
}
```

## Features

### RSU Management
- ✅ List all RSUs with status
- ✅ Register new RSU (IP + Port)
- ✅ Edit RSU configuration
- ✅ Delete RSU with confirmation
- ✅ Search filtering
- ✅ Status filtering (All/Online/Offline)
- ✅ Real-time status indicators

### TRU Management
- ✅ Monitor TRU status
- ✅ View TRU configurations
- ✅ Display associated RSU count
- ✅ Search and filter capabilities
- ✅ Last seen timestamps

### Data Selection
- ✅ Visual pipeline with progress indicator
- ✅ TRU selection
- ✅ RSU selection (filtered by TRU)
- ✅ Data type filtering (BSM, TIM, SPaT, MAP, etc.)
- ✅ Topic selection with checkboxes
- ✅ Select All / Clear All functionality
- ✅ Save configuration to backend
- ✅ Reset selection

## Usage

### Accessing the Module

Navigate to `/rsu-management` in the application. The module is integrated into the main router and requires authentication.

### RSU Status Tab

1. **View RSUs**: All RSUs are displayed in a table with their status
2. **Register RSU**: Click "Register RSU" button, enter IP and port
3. **Edit RSU**: Click the edit icon on any RSU row
4. **Delete RSU**: Click the delete icon, confirm deletion
5. **Filter**: Use the search box or status dropdown

### TRU Status Tab

1. **View TRUs**: All TRUs are displayed with their status
2. **Monitor**: View online/offline status and last seen time
3. **Filter**: Search by unit ID or name, filter by status

### Data Selection Tab

1. **Select TRU**: Choose a TRU from the left panel
2. **Select RSU**: Choose an RSU from the second panel
3. **Filter Topics**: Optionally filter by data type
4. **Select Topics**: Check/uncheck topics to monitor
5. **Save**: Click "Save Configuration" to persist changes

## API Endpoints

The frontend expects the following API endpoints:

### TRU Endpoints
- `GET /api/tru/configs` - Get all TRU configurations
- `GET /api/tru/configs/:unitId` - Get TRU config by ID
- `PUT /api/tru/configs/:unitId` - Update TRU config
- `GET /api/tru/status` - Get all TRU statuses
- `GET /api/tru/status/:unitId` - Get TRU status by ID
- `GET /api/tru/topics` - Get all TRU topics
- `GET /api/tru/topics/:unitId` - Get TRU topics by ID
- `PUT /api/tru/topics/:unitId` - Update TRU topics

### RSU Endpoints
- `GET /api/rsu/configs` - Get all RSU configurations
- `GET /api/rsu/configs/:ip/:port` - Get RSU config
- `POST /api/rsu/configs` - Register new RSU
- `PUT /api/rsu/configs/:ip/:port` - Update RSU config
- `DELETE /api/rsu/configs/:ip/:port` - Delete RSU
- `GET /api/rsu/status` - Get all RSU statuses
- `GET /api/rsu/status/:ip/:port` - Get RSU status
- `GET /api/rsu/topics/:ip/:port` - Get RSU topics
- `PUT /api/rsu/topics/:ip/:port` - Update RSU topics

## Dependencies

The module uses the following Material-UI components:
- `@mui/material` - UI components
- `@mui/icons-material` - Icons
- `react-router-dom` - Routing
- `axios` - HTTP client

All dependencies are already included in the project's package.json.

## Integration

The module is integrated into the application through:

1. **App.js** - Wraps the app with context providers
2. **MainRouter.js** - Adds the `/rsu-management` route
3. **Navbar.js** - Provides navigation link (optional)

## Future Enhancements

Potential improvements:
- Real-time status updates via WebSocket
- Bulk RSU operations
- Advanced analytics and reporting
- Export/import configurations
- Historical status tracking
- Map visualization of RSU/TRU locations

## License

Copyright (C) 2026 LEIDOS.

Licensed under the Apache License, Version 2.0.
