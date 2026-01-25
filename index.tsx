import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { msalConfig } from "./authConfig.ts";
import App from './App.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import './index.css';

// Initialize the MSAL instance outside the render loop
const msalInstance = new PublicClientApplication(msalConfig);

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element");

const root = ReactDOM.createRoot(rootElement);

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const withGoogleProvider = (children: React.ReactNode) =>
  googleClientId ? <GoogleOAuthProvider clientId={googleClientId}>{children}</GoogleOAuthProvider> : <>{children}</>;

root.render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      {withGoogleProvider(
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      )}
    </MsalProvider>
  </React.StrictMode>
);