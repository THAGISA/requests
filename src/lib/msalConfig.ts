import { PublicClientApplication, Configuration, LogLevel } from '@azure/msal-browser'

const isDevelopment = import.meta.env.DEV

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      logLevel: isDevelopment ? LogLevel.Verbose : LogLevel.Error,
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return
        if (isDevelopment) console.log(`MSAL: ${message}`)
      },
    },
  },
}

export const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
}

export const msalInstance = new PublicClientApplication(msalConfig)
