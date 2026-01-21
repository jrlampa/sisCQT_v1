
import { Configuration, LogLevel } from "@azure/msal-browser";

export const msalConfig: Configuration = {
    auth: {
        clientId: "SEU_CLIENT_ID_DA_AZURE", // Substituir pelo ID do Aplicativo
        authority: "https://login.microsoftonline.com/SEU_TENANT_ID", // Substituir pelo Tenant ID ou 'common'
        redirectUri: window.location.origin,
    },
    cache: {
        cacheLocation: "localStorage",
        storeAuthStateInCookie: false,
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) return;
                switch (level) {
                    case LogLevel.Error: console.error(message); return;
                    case LogLevel.Info: console.info(message); return;
                    case LogLevel.Verbose: console.debug(message); return;
                    case LogLevel.Warning: console.warn(message); return;
                }
            }
        }
    }
};

export const loginRequest = {
    scopes: ["User.Read"]
};
