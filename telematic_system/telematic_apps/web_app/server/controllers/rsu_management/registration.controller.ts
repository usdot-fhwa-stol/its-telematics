
import { AssignRSU } from "../../application/rsu_management/assign_rsu";
import { RemoveRSU } from "../../application/rsu_management/remove_rsu";
import { UpdateRSUConfig } from "../../application/rsu_management/update_rsu_config";
import { AllRsuRegistrationStatus } from "../../application/rsu_management/all_rsu_registration_status";
import { NextFunction, Request, Response } from "express";
import { TruConfigMessage } from "../../models/rsu_management/tru_config_message.model";
import { UnitConfig } from "../../models/rsu_management/unit_config.model";
import { RsuConfigItemMessage } from "../../models/rsu_management/rsu_config_item.model";
import { RSUEndpoint } from "../../models/rsu_management/rsu_endpoint.model";
import { SnmpConfigMessage } from "../../models/rsu_management/snmp_config_message.model";

export class RegistrationController {
    private readonly assignRSUApp: AssignRSU;
    private readonly removeRSUApp: RemoveRSU;
    private readonly updateRSUConfigApp: UpdateRSUConfig;
    private readonly allRsuRegistrationStatusApp: AllRsuRegistrationStatus;
    
    constructor(
        assignRSUApp: AssignRSU,
        removeRSUApp: RemoveRSU,
        updateRSUConfigApp: UpdateRSUConfig,
        allRsuRegistrationStatusApp: AllRsuRegistrationStatus
    ) {
        this.assignRSUApp = assignRSUApp;
        this.removeRSUApp = removeRSUApp;
        this.updateRSUConfigApp = updateRSUConfigApp;
        this.allRsuRegistrationStatusApp = allRsuRegistrationStatusApp;
    }

    assignRSU = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
        console.log('RegistrationController: Received RSU assignment request');
        
        try {
            const truConfigMessage: TruConfigMessage | null = this.mapToTruConfigMessage(req.body);
            
            if (!truConfigMessage) {
                console.error('RegistrationController: Missing request body');
                return res.status(400).send({ 
                    error: "Request body is required",
                    message: "TruConfigMessage must be provided in the request body"
                });
            }

            console.log(`RegistrationController: Processing assignment for unit ${truConfigMessage.unitConfig?.unitId}`);
            
            const result = await this.assignRSUApp.execute(truConfigMessage);
            
            console.log('RegistrationController: RSU assignment successful');
            res.status(200).send({ 
                message: "RSU assigned successfully",
                data: result
            });
        } catch (error: any) {
            console.error(`RegistrationController: Failed to assign RSU - ${error.message}`, error);
            res.status(500).send({ 
                error: "Failed to assign RSU",
                message: error.message
            });
        }
    }
    
    removeRSUAssignment = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
        console.log('RegistrationController: Received RSU removal request');
        
        try {
            const truConfigMessage: TruConfigMessage | null = this.mapToTruConfigMessage(req.body);
            
            if (!truConfigMessage) {
                console.error('RegistrationController: Missing request body');
                return res.status(400).send({ 
                    error: "Request body is required",
                    message: "TruConfigMessage must be provided in the request body"
                });
            }

            console.log(`RegistrationController: Processing removal for unit ${truConfigMessage.unitConfig?.unitId}`);
            
            const result = await this.removeRSUApp.execute(truConfigMessage);
            
            console.log('RegistrationController: RSU removal successful');
            res.status(200).send({ 
                message: "RSU removed successfully",
                data: result
            });
        } catch (error: any) {
            console.error(`RegistrationController: Failed to remove RSU - ${error.message}`, error);
            res.status(500).send({ 
                error: "Failed to remove RSU",
                message: error.message
            });
        }
    }

    updateRSUConfig = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
        console.log('RegistrationController: Received RSU config update request');
        
        try {
            const truConfigMessage: TruConfigMessage | null = this.mapToTruConfigMessage(req.body);
            
            if (!truConfigMessage) {
                console.error('RegistrationController: Missing request body');
                return res.status(400).send({ 
                    error: "Request body is required",
                    message: "TruConfigMessage must be provided in the request body"
                });
            }

            console.log(`RegistrationController: Processing config update for unit ${truConfigMessage.unitConfig?.unitId}`);
            
            const result = await this.updateRSUConfigApp.execute(truConfigMessage);
            
            console.log('RegistrationController: RSU config update successful');
            res.status(200).send({ 
                message: "RSU configuration updated successfully",
                data: result
            });
        } catch (error: any) {
            console.error(`RegistrationController: Failed to update RSU config - ${error.message}`, error);
            res.status(500).send({ 
                error: "Failed to update RSU configuration",
                message: error.message
            });
        }
    }

    getAllTruConfig = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
        console.log('RegistrationController: Received request to get all TRU configs');
        
        try {
            const result = await this.allRsuRegistrationStatusApp.execute();
            
            console.log(`RegistrationController: Retrieved ${result.length} TRU config(s) successfully`);
            res.status(200).send({ 
                message: "TRU configurations retrieved successfully",
                data: result,
                count: result.length
            });
        } catch (error: any) {
            console.error(`RegistrationController: Failed to get all TRU configs - ${error.message}`, error);
            res.status(500).send({ 
                error: "Failed to retrieve TRU configurations",
                message: error.message
            });
        }
    }

    private mapToTruConfigMessage(data: any): TruConfigMessage | null {
        if (!data) {
            return null;
        }

        // Map Unit Config
        const unitConfig = data.unitConfig ? new UnitConfig(
            data.unitConfig.unitId,
            data.unitConfig.name,
            data.unitConfig.maxConnections,
            data.unitConfig.pluginHeartbeatInterval,
            data.unitConfig.healthMonitorPluginHeartbeatInterval,
            data.unitConfig.rsuStatusMonitorInterval,
            data.unitConfig.timestamp
        ) : null;

        if (!unitConfig) {
            throw new Error('Unit configuration is required');
        }

        // Map RSU Configs
        const rsuConfigs: RsuConfigItemMessage[] = Array.isArray(data.rsuConfigs)
            ? data.rsuConfigs.map((rsuConfig: any) => {
                const rsu = rsuConfig.rsu
                    ? new RSUEndpoint(
                        rsuConfig.rsu.ip,
                        rsuConfig.rsu.port,
                        rsuConfig.rsu.timestamp
                    )
                    : null;

                if (!rsu) {
                    throw new Error('RSU endpoint is required for each RSU config');
                }

                const snmpConfig = rsuConfig.snmpConfig || rsuConfig.snmp ? new SnmpConfigMessage(
                    (rsuConfig.snmpConfig || rsuConfig.snmp)?.privacyProtocol,
                    (rsuConfig.snmpConfig || rsuConfig.snmp)?.securityLevel,
                    (rsuConfig.snmpConfig || rsuConfig.snmp)?.authProtocol,
                    (rsuConfig.snmpConfig || rsuConfig.snmp)?.authPassPhrase,
                    (rsuConfig.snmpConfig || rsuConfig.snmp)?.user,
                    (rsuConfig.snmpConfig || rsuConfig.snmp)?.privacyPassPhrase,
                    (rsuConfig.snmpConfig || rsuConfig.snmp)?.rsuMibVersion
                ) : undefined;

                return new RsuConfigItemMessage(
                    rsuConfig.action,
                    rsuConfig.event,
                    rsu,
                    snmpConfig
                );
            })
            : [];

        return new TruConfigMessage(
            unitConfig,
            rsuConfigs,
            data.timestamp
        );
    }


}