
import { Configuration, LogLevel } from "@azure/msal-browser";

export const msalConfig: Configuration = {
    auth: {
        // ID do Aplicativo sisCQT Enterprise (Registrado na IM3 Brasil)
        clientId: "df5b2c78-c26b-47ae-aa8c-86dab74752fb",
        
        // URL da Organização (IM3 Brasil) - Locatário específico
        authority: "https://login.microsoftonline.com/c580bd4a-fb89-4bde-b6ae-715befa1ab31",
        
        // Onde o usuário 'cai' após logar. 
        // Em desenvolvimento local: http://localhost:5173
        redirectUri: window.location.origin, 
    },
    // Cast cache to any to handle storeAuthStateInCookie which may not be in standard CacheOptions type in all versions
    cache: {
        cacheLocation: "sessionStorage", // 'sessionStorage' é mais seguro que localStorage para dados de sessão
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
                        // console.info(message); // Descomente para debugar login
                        return;
                    case LogLevel.Verbose:
                        console.debug("[MSAL Verbose]", message);
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
