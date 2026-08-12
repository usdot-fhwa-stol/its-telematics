![GitHub Release](https://img.shields.io/github/v/release/usdot-fhwa-stol/its-telematics) [![Tests](https://github.com/usdot-fhwa-stol/its-telematics/actions/workflows/tests.yml/badge.svg)](https://github.com/usdot-fhwa-stol/its-telematics/actions/workflows/tests.yml) ![Docker Pulls](https://img.shields.io/docker/pulls/usdotfhwastoldev/telematic_cloud_messaging?label=Docker%20Pulls%20-%20telematic_cloud_messaging) ![Docker Pulls](https://img.shields.io/docker/pulls/usdotfhwastoldev/telematic_rsu_management_service?label=Docker%20Pulls%20-%20telematic_rsu_management_service) ![Docker Pulls](https://img.shields.io/docker/pulls/usdotfhwastoldev/carma_street_nats_bridge?label=Docker%20Pulls%20-%20carma_street_nats_bridge) ![Docker Pulls](https://img.shields.io/docker/pulls/usdotfhwastoldev/carma_vehicle_nats_bridge?label=Docker%20Pulls%20-%20carma_vehicle_nats_bridge) ![Docker Pulls](https://img.shields.io/docker/pulls/usdotfhwastoldev/carma_cloud_nats_bridge?label=Docker%20Pulls%20-%20carma_cloud_nats_bridge) ![Docker Pulls](https://img.shields.io/docker/pulls/usdotfhwastoldev/telematic_historical_data_processing?label=Docker%20Pulls%20-%20telematic_historical_data_processing) ![Docker Pulls](https://img.shields.io/docker/pulls/usdotfhwastoldev/telematic_web_server?label=Docker%20Pulls%20-%20telematic_web_server) ![Docker Pulls](https://img.shields.io/docker/pulls/usdotfhwastoldev/telematic_web_client?label=Docker%20Pulls%20-%20telematic_web_client) ![Docker Pulls](https://img.shields.io/docker/pulls/usdotfhwastoldev/telematic_apache2?label=Docker%20Pulls%20-%20telematic_apache2) ![Docker Pulls](https://img.shields.io/docker/pulls/usdotfhwastoldev/telematic_grafana?label=Docker%20Pulls%20-%20telematic_grafana) ![Docker Pulls](https://img.shields.io/docker/pulls/usdotfhwastoldev/telematic_local_apache2?label=Docker%20Pulls%20-%20telematic_local_apache2) [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=usdot-fhwa-stol_its-telematics&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=usdot-fhwa-stol_its-telematics) ![GitHub License](https://img.shields.io/github/license/usdot-fhwa-stol/its-telematics)

# ITS Telematics
This project will create an open-source Module that can be installed on any vehicle (e.g. a CARMA Platform and/or Messenger vehicle, an L0 or L1 production vehicle, etc.) that will collect data about the vehicle and wirelessly send it out in real time for data analysis. The same Module, with any modifications, if necessary, will also be compatible with CARMA Streets and CARMA Cloud. On the receiving end of this data, a user will have a Data Processing & Visualization Tool available to visualize and/or plot the data that was sent using the Module(s). This Module can be thought of as a Fleet Management tool with extra capabilities to support CDA research and education.

## Architecture Diagram
[Detailed Design](https://usdot-carma.atlassian.net/wiki/spaces/WFD2/pages/2230321179/Detailed+System+Design)

![architecture](https://user-images.githubusercontent.com/34483068/171265484-67177ebb-69f7-4286-9602-016043079958.png)

## Release Notes
The current version and release history of ITS Telematics can be found in the [ITS Telematics Release Notes](docs/Release_notes.md).

## Documentation
Documentation of the setup, operation, and design of ITS Telematics can be found on the project [Confluence](https://usdot-carma.atlassian.net/wiki/spaces/WFD2/overview) pages.


## Contribution
Welcome to the ITS Telematics contributing guide. Please read this guide to learn about our development process, how to propose pull requests and improvements, and how to build and test your changes to this project. [ITS Telematics Contributing Guide](Contributing.md)

## Code of Conduct
Please read our [ITS Telematics Code of Conduct](Code_of_Conduct.md) which outlines our expectations for participants within the developer community, as well as steps to reporting unacceptable behavior. We are committed to providing a welcoming and inspiring community for all and expect our code of conduct to be honored. Anyone who violates this code of conduct may be banned from the community.

## Attribution
The development team would like to acknowledge the people who have made direct contributions to the design and code in this repository. [ITS Telematics Attribution](ATTRIBUTION.md)

## License
By contributing to the Federal Highway Administration (FHWA) ITS Telematics repository, you agree that your contributions will be licensed under its Apache License 2.0 license. [ITS Telematics License](<docs/License.md>)

## Contact
Please click on the link below to visit the Federal Highway Adminstration(FHWA) CARMA website. For more information, contact CAVSupportServices@dot.gov.

[CARMA Contacts](https://highways.dot.gov/research/research-programs/operations/CARMA)

## Support
For technical support from the CARMA team, please contact the CARMA help desk at CAVSupportServices@dot.gov.
