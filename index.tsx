
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PublicClientApplication, Configuration } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./authConfig";
import App from './App.tsx';
import { ToastProvider } from './context/ToastContext.tsx';

let msalInstance: PublicClientApplication;

// Se as chaves forem placeholders, usamos uma config dummy para não quebrar os hooks do React
const isConfigValid = msalConfig.auth.clientId && msalConfig.auth.clientId !== "SEU_CLIENT_ID_DA_AZURE";

if (isConfigValid) {
  msalInstance = new PublicClientApplication(msalConfig);
} else {
  const dummyConfig: Configuration = {
    auth: {
      clientId: "00000000-0000-0000-0000-000000000000",
      authority: "https://login.microsoftonline.com/common",
      redirectUri: window.location.origin,
    }
  };
  msalInstance = new PublicClientApplication(dummyConfig);
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element");

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </MsalProvider>
  </React.StrictMode>
);
