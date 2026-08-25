 ITS Telematics Release Notes
----------------------------

### Version 1.0.0, released Aug 6th 2026

### Summary

The ITS Telematics 1.0.0 release includes the following significant updates:

- The ITS Telematics tool has been updated with direct RSU connectivity and registration management through the new RSU Management Service and Telematics V2X radio unit services.
- The RSU Management Service added RSU configuration and registration management across the backend service, REST APIs, and UI. These updates allow users to register RSUs, monitor RSU status, manage Telematics V2X radio unit-to-RSU mappings, and select RSU topics.
- The Telematics V2X Radio Unit fork has been updated with telematics-specific V2X Hub changes for RSU data streaming, RSU health/status reporting, source identification, RSU Management Service integration, Docker networking, and CI workflow support.
- The ITS Telematics Tool has been updated with a new mobile application foundation, including mobile authentication, server configuration, Grafana connectivity, and Capacitor-based Android support.
- The Telematics Kafka Bridge has been renamed and enhanced to improve Telematics-to-ODE integration, startup behavior, connection handling, publish/error handling, and unit test coverage. This functionality will be regression tested in a later release and is currently included as a beta version.
- Data Analysis scripts for testing support have been updated to support latency and data continuity analysis from generated logs of newly added services.
- Optional performance logging has been added to stream message processing times to the database to allow performance monitoring from the Grafana dashboard.
- CI/CD, SonarCloud, Docker Scout, Docker Compose, and dependency-management updates have been added to improve build stability and release configuration.

Note: The Telematics V2X Radio Unit fork is based on the V2X Hub 7.11.0 version baseline.

## Changes to Key Existing Repositories

### ITS Telematics

In this release, ITS Telematics is updated to support mobile field workflows and RSU configuration and registration management. The mobile updates include authentication, server configuration, Grafana connectivity, and Android support. RSU configuration management updates include service, API, and UI support for RSU registration, status monitoring, Telematics V2X Radio Unit-to-RSU mapping, and topic selection.

Note: ITS Telematics was previously released as CAV/CDA Telematics as part of CARMA Platform. For release history prior to ITS Telematics 1.0.0, refer to the [CARMA Platform Release Notes](https://github.com/usdot-fhwa-stol/carma-platform/blob/master/docs/Release_notes.md).

**Enhancements**

- Mobile Application: Added the mobile application foundation for field use, including Capacitor Android support, mobile authentication, server configuration, and Grafana access from the mobile app.

  * Pull Requests: [its-telematics PR #269](https://github.com/usdot-fhwa-stol/its-telematics/pull/269), [its-telematics PR #272](https://github.com/usdot-fhwa-stol/its-telematics/pull/272), [its-telematics PR #273](https://github.com/usdot-fhwa-stol/its-telematics/pull/273), [its-telematics PR #275](https://github.com/usdot-fhwa-stol/its-telematics/pull/275)

- RSU Configuration Management: Added backend service, REST API, and UI support for RSU registration, RSU health/status monitoring, Telematics V2X Radio Unit-to-RSU mapping, dynamic RSU configuration updates, RSU topic-selection workflows and reporting unavailable RSU status when SNMP connection timeouts occur.

  * Pull Requests: [its-telematics PR #268](https://github.com/usdot-fhwa-stol/its-telematics/pull/268), [its-telematics PR #271](https://github.com/usdot-fhwa-stol/its-telematics/pull/271), [its-telematics PR #274](https://github.com/usdot-fhwa-stol/its-telematics/pull/274), [its-telematics PR #290](https://github.com/usdot-fhwa-stol/its-telematics/pull/290)

- Telematics Kafka Bridge: Renamed bridge components from carma_street_bridge to kafka_bridge and improved bridge reliability, startup behavior, NATS connection handling, Kafka publish/error handling, configuration parsing, unit test coverage, and Sonar workflow integration.

  * Pull Requests: [its-telematics PR #296](https://github.com/usdot-fhwa-stol/its-telematics/pull/296), [its-telematics PR #303](https://github.com/usdot-fhwa-stol/its-telematics/pull/303)

- Data Analysis Support: Added log-analysis scripts for Telematics V2X Radio Unit and RSU Management Service logs, including message matching, drop-rate, latency, throughput, and summary output. Optional performance logging was also added to support writing metrics to database for dashboard visualization.

  * Pull Requests: [its-telematics PR #305](https://github.com/usdot-fhwa-stol/its-telematics/pull/305), [its-telematics PR #306](https://github.com/usdot-fhwa-stol/its-telematics/pull/306)

- Deployment Configuration: Added Docker Compose environment variables so release deployments can pull images from the correct Docker organization and tag. A default InfluxDB retention value was also added to avoid deployment errors when the retention variable is not set.

  * Pull Requests: [its-telematics PR #308](https://github.com/usdot-fhwa-stol/its-telematics/pull/308), [its-telematics PR #300](https://github.com/usdot-fhwa-stol/its-telematics/pull/300)

**Fixes**

- InfluxDB Parsing: Fixed an InfluxDB line-protocol parsing failure and extended the parsing fix to additional message formats.

  * Pull Requests: [its-telematics PR #289](https://github.com/usdot-fhwa-stol/its-telematics/pull/289), [its-telematics PR #292](https://github.com/usdot-fhwa-stol/its-telematics/pull/292)

- RSU Registration and Configuration: Fixed RSU registration errors that prevented dynamically added RSUs from being added or edited through the UI. Additional fixes include event-name validation, preventing RSU IP changes after registration, supporting stop-broadcast behavior, refreshing RSU health status and available topics after registration changes, removing unnecessary port display from the data-selection tab, preventing RSU selections from being cleared during rapid save actions and setting RSU status to pending after configuration changes.

  * Pull Requests: [its-telematics PR #277](https://github.com/usdot-fhwa-stol/its-telematics/pull/277), [its-telematics PR #283](https://github.com/usdot-fhwa-stol/its-telematics/pull/283), [its-telematics PR #288](https://github.com/usdot-fhwa-stol/its-telematics/pull/288)

- UI and Mobile Behavior: Fixed issues where old Telematics V2X Radio Units continued to appear on the data-selection tab after all Telematics V2X Radio Units were stopped, tablet login-page content overlapped when the keyboard was opened in horizontal mode, and the mobile registration page used the wrong web_server_uri before calling registration APIs.

  * Pull Requests: [its-telematics PR #285](https://github.com/usdot-fhwa-stol/its-telematics/pull/285), [its-telematics PR #293](https://github.com/usdot-fhwa-stol/its-telematics/pull/293), [its-telematics PR #295](https://github.com/usdot-fhwa-stol/its-telematics/pull/295)

- Deployment and Container Fixes: Fixed the Telematics Cloud Messaging Docker image, added localhost origin support to environment files, restored the wait-for-it package required by the web-server image, pinned the Grafana image to a fixed version instead of latest, and updated the MySQL version to resolve Grafana/MySQL compatibility issues. Added container profiles for full-system integration testing.

  * Pull Requests: [its-telematics PR #280](https://github.com/usdot-fhwa-stol/its-telematics/pull/280), [its-telematics PR #294](https://github.com/usdot-fhwa-stol/its-telematics/pull/294), [its-telematics PR #307](https://github.com/usdot-fhwa-stol/its-telematics/pull/307), [its-telematics PR #279](https://github.com/usdot-fhwa-stol/its-telematics/pull/279)

- Improved CI/CD and dependency management: Improved SonarCloud, coverage, and local code-quality configuration by adding sonar-project.properties, excluding coverage output from Sonar analysis, excluding the UI from coverage results, adding SonarLint VS Code setup, addressing SonarCloud code smells, pinning npm package versions, and committing package-lock.json for more stable builds. Updated third-party GitHub Actions, adding Docker Scout checks, removing the Maven wrapper, and using the Docker base image for Maven installation/version control.

  * Pull Requests: [its-telematics PR #287](https://github.com/usdot-fhwa-stol/its-telematics/pull/287), [its-telematics PR #282](https://github.com/usdot-fhwa-stol/its-telematics/pull/282), [its-telematics PR #284](https://github.com/usdot-fhwa-stol/its-telematics/pull/284), [its-telematics PR #301](https://github.com/usdot-fhwa-stol/its-telematics/pull/301), [its-telematics PR #299](https://github.com/usdot-fhwa-stol/its-telematics/pull/299), [its-telematics PR #302](https://github.com/usdot-fhwa-stol/its-telematics/pull/302), [its-telematics PR #265](https://github.com/usdot-fhwa-stol/its-telematics/pull/265), [its-telematics PR #297](https://github.com/usdot-fhwa-stol/its-telematics/pull/297), [its-telematics PR #304](https://github.com/usdot-fhwa-stol/its-telematics/pull/304), [its-telematics PR #286](https://github.com/usdot-fhwa-stol/its-telematics/pull/286)

## New Forked Repositories

### Telematics V2X Radio Unit

The Telematics V2X Radio Unit is an enhanced telematics-specific fork of V2X Hub with no prior release. In this release, the fork is synced with the V2X Hub 7.11.0 / Viper baseline and updated with telematics-specific Telematics V2X Radio Unit support for RSU data streaming, RSU health/status reporting, source identification, RSU Management Service integration, message receiver configuration, Docker networking, performance logging, and CI workflow support.

**Enhancements made to the V2X Hub Fork**

- Telematics V2X Radio Unit Baseline: Synced the telematics fork with the V2X Hub 7.11.0 / Viper baseline and brought forward upstream telematics Telematics V2X Radio Unit (TRU) updates for multi-RSU data streaming, RSU health/status reporting, source identification in routed messages, RSU Health Monitor configuration updates, and RSU Management Service integration.

  * Related Pull Requests: V2X-Hub PR #831

- Docker Image Routing and CI Workflow Updates: Routed the V2X Hub Docker image to the correct Docker organization and tag by branch using the shared docker-org-and-tag composite action and updated third-party action versions.

  * Pull Requests: [telematics-v2x-radio-unit PR #13](https://github.com/usdot-fhwa-stol/telematics-v2x-radio-unit/pull/13)

- Message Receiver Configuration: Added the message-receiver port to the environment configuration.

  * Pull Requests: [telematics-v2x-radio-unit PR #6](https://github.com/usdot-fhwa-stol/telematics-v2x-radio-unit/pull/6)

- Data Analysis Support: Added performance logging support for data analysis of latency and data contuinity.

  * Pull Requests: [telematics-v2x-radio-unit PR #12](https://github.com/usdot-fhwa-stol/telematics-v2x-radio-unit/pull/12)

**Fixes made to the V2X Hub Fork**

- Telematics V2X Radio Unit Bug Fix Sync: Synced Telematics V2X RSU Unit end-to-end testing fixes from V2X Hub, including Docker image workflow updates, Telematics V2X RSU Unit database reuse, corrected image tagging, startup auto-configuration fixes, Telematics V2X RSU Unit naming, RSU health-monitor startup handling, MIB-version support, available-topic publishing fixes, and separate auto/manual configuration topics.

  * Pull Requests: [telematics-v2x-radio-unit PR #3](https://github.com/usdot-fhwa-stol/telematics-v2x-radio-unit/pull/3)

- RSU Status and Available Topic Updates: Fixed RSU health status and available-topic updates after RSU registration changes so removed RSUs no longer continue to appear in available topics or health-status reporting. RSU status reporting was also updated to report stale RSU status when incorrect SNMP credentials are supplied and unavailable RSU status when SNMP connection timeouts occur.

  * Pull Requests: [telematics-v2x-radio-unit PR #5](https://github.com/usdot-fhwa-stol/telematics-v2x-radio-unit/pull/5), [telematics-v2x-radio-unit PR #9](https://github.com/usdot-fhwa-stol/telematics-v2x-radio-unit/pull/9), [telematics-v2x-radio-unit PR #11](https://github.com/usdot-fhwa-stol/telematics-v2x-radio-unit/pull/11)

- Telematics V2X RSU Unit Configuration and Networking: Fixed the rsuConfig path used for RSU auto-configuration and updated Docker networking to use a bridge network so ports can be mapped for messageReceiver and tmxCore.

  * Pull Requests: [telematics-v2x-radio-unit PR #8](https://github.com/usdot-fhwa-stol/telematics-v2x-radio-unit/pull/8), [telematics-v2x-radio-unit PR #7](https://github.com/usdot-fhwa-stol/telematics-v2x-radio-unit/pull/7)

**Other Updates**

- Added container profiles for full-system integration testing.

  * Pull Requests: [telematics-v2x-radio-unit PR #4](https://github.com/usdot-fhwa-stol/telematics-v2x-radio-unit/pull/4)

- Added manual workflow trigger support and updated CI workflows for the telematics fork.

  * Pull Requests: [telematics-v2x-radio-unit PR #2](https://github.com/usdot-fhwa-stol/telematics-v2x-radio-unit/pull/2), [telematics-v2x-radio-unit PR #1](https://github.com/usdot-fhwa-stol/telematics-v2x-radio-unit/pull/1)