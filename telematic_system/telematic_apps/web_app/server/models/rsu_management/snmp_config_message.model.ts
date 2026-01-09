export class SnmpConfigMessage {
    privacyProtocol?: string;
    securityLevel?: string;
    authProtocol?: string;
    authPassPhrase?: string;
    user?: string;
    privacyPassPhrase?: string;
    rsuMibVersion?: string;

    constructor(
        privacyProtocol?: string,
        securityLevel?: string,
        authProtocol?: string,
        authPassPhrase?: string,
        user?: string,
        privacyPassPhrase?: string,
        rsuMibVersion?: string
    ) {
        this.privacyProtocol = privacyProtocol;
        this.securityLevel = securityLevel;
        this.authProtocol = authProtocol;
        this.authPassPhrase = authPassPhrase;
        this.user = user;
        this.privacyPassPhrase = privacyPassPhrase;
        this.rsuMibVersion = rsuMibVersion;
    }
}