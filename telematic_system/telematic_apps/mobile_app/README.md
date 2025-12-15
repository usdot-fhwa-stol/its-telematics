# CAV Telematics Mobile Application

A cross-platform mobile application for Connected and Automated Vehicle (CAV) telematics management, built with React and Ionic Capacitor.

## Overview

The CAV Telematics Mobile Application provides mobile access to the telematics system, allowing users to manage events, monitor topics, view dashboards, and administer users on Android devices.

## Features

- **User Authentication & Authorization** - Secure login with JWT token-based authentication
- **Event Management** - Create, view, edit, and delete testing events
- **Topic Management** - Monitor and manage vehicle and infrastructure topics
- **Grafana Dashboards** - View real-time telemetry and analytics dashboards
- **User Administration** - Manage users and roles (admin only)

## Technology Stack

### Frontend
- **React 18.2.0** - UI framework
- **Material-UI v5** - Component library
- **React Router v6** - Navigation
- **Axios** - HTTP client for API calls
- **React Hook Form** - Form management

### Mobile
- **Ionic Capacitor** - Native mobile runtime
- **Android SDK** - Android platform support

### Backend
- **Node.js/Express** - REST API server
- **MySQL** - Database
- **JWT** - Authentication tokens
- **AWS S3** - File storage

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 16.x or higher ([Download](https://nodejs.org/))
- **npm** 8.x or higher (comes with Node.js)
- **Android Studio** ([Download](https://developer.android.com/studio))
- **Java JDK** 17 or higher ([Download](https://www.oracle.com/java/technologies/downloads/))
- **Git** (for version control)

## Installation

### 1. Clone the Repository
```bash
git clone 
cd telematic_apps/mobile_app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment

Create a `.env` file in the root directory or update `src/env.js`:
```javascript
// src/env.js
export const BASE_URL = 'http://your-backend-url:8080/telematic';
export const WS_URL = 'ws://your-backend-url:8080';
```

Or create `.env` file:
```env
REACT_APP_API_URL=http://your-backend-url:8080/telematic
REACT_APP_WS_URL=ws://your-backend-url:8080
```

### 4. Verify Setup

Test that the web version works before building for mobile:
```bash
npm start
```

Open http://localhost:3000 and verify:
- Login page loads
- Can authenticate
- Can navigate between pages

## Building for Android

### 1. Build the React Application
```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

### 2. Sync with Capacitor
```bash
npx cap sync android
```

This copies your React build to the Android project and updates native dependencies.

### 3. Open in Android Studio
```bash
npx cap open android
```

### 4. Run on Device/Emulator

In Android Studio:
1. Connect an Android device (with USB debugging enabled) OR start an emulator
2. Select your device from the dropdown
3. Click the green **Run** button (▶️)