/*
 * Copyright (C) 2019-2024 LEIDOS.
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
require('dotenv').config();

module.exports = {
    HOST: process.env.DB_HOST,
    PORT: process.env.DB_PORT,
    USER: process.env.DB_USER,
    PASSWORD: process.env.DB_PASSWORD,
    GRAFANA_DB: process.env.GRAFANA_DB,
    dialect: 'mysql',
    define: {
        timestamps: false
    },
    pool: {
        max: 5, //maximum number of connection in pool
        min: 0, //minimum number of connection in pool
        acquire: 30000, //maximum time, in milliseconds, that a connection can be idle before being released
        idle: 10000//maximum time, in milliseconds, that pool will try to get connection before throwing error
    }
}