/*
 * Copyright (C) 2019-2026 LEIDOS.
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
 *
 * Grafana Auth Controller
 *
 * Provides JWT token generation for mobile Grafana access.
 * Uses the app's session token to generate a Grafana-specific JWT.
 */

const jwt = require('jsonwebtoken');

const TOKEN_EXPIRY = '1h';

/**
 * Generate Grafana JWT from app session token (SSO approach)
 * GET /api/grafana-auth/session
 * Header: Authorization: <app_session_token>
 */
const authenticateWithSession = (req, res) => {
  try {
    const appToken = req.headers.authorization;

    if (!appToken) {
      return res.status(401).json({ error: 'No session token provided' });
    }

    const decoded = jwt.verify(appToken, process.env.SECRET);

    if (!decoded || !decoded.username) {
      return res.status(401).json({ error: 'Invalid session token' });
    }

    const grafanaToken = jwt.sign(
      {
        username: decoded.username,
        purpose: 'grafana_auth',
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    res.json({
      success: true,
      token: grafanaToken,
      username: decoded.username,
      expiresIn: TOKEN_EXPIRY
    });
  } catch (err) {
    console.error('Grafana auth error:', err.message);
    res.status(401).json({ error: 'Authentication failed', details: err.message });
  }
};

/**
 * Validate existing Grafana token (for debugging)
 * GET /api/grafana-auth/validate
 * Query: token=<grafana_token>
 */
const validate = (req, res) => {
  try {
    const token = req.query.token;

    if (!token) {
      return res.status(400).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.SECRET);

    res.json({
      valid: true,
      username: decoded.username,
      purpose: decoded.purpose,
      issuedAt: new Date(decoded.iat * 1000).toISOString(),
      expiresAt: new Date(decoded.exp * 1000).toISOString()
    });
  } catch (err) {
    res.status(401).json({ valid: false, error: err.message });
  }
};

module.exports = {
  authenticateWithSession,
  validate
};
