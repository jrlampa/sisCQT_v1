import { Configuration, LogLevel } from "@azure/msal-browser";

const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

export const msalConfig: Configuration = {
    auth: {
        // ID do Aplicativo sisCQT Enterprise (Registrado na IM3 Brasil)
        clientId: import.meta.env.VITE_MSAL_CLIENT_ID || "df5b2c78-c26b-47ae-aa8c-86dab74752fb",
        
        // URL da Organização (IM3 Brasil) - Locatário específico
        authority: import.meta.env.VITE_MSAL_AUTHORITY || "https://login.microsoftonline.com/c580bd4a-fb89-4bde-b6ae-715befa1ab31",
        
        // Redirecionamento dinâmico: local ou produção
        redirectUri: isLocalhost ? 'http://localhost:3000' : window.location.origin, 
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    } as any,
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) return;
                switch (level) {
                    case LogLevel.Error:
                        console.error("[MSAL Error]", message);
                        return;
                    case LogLevel.Info:
                        return;
                    case LogLevel.Verbose:
                        return;
                    case LogLevel.Warning:
                        console.warn("[MSAL Warning]", message);
                        return;
                }
            }
        }
    }
};

// Escopos necessários para autenticação e leitura de perfil básico
export const loginRequest = {
    scopes: ["User.Read", "openid", "profile"]
};