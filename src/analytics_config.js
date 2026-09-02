export const ANALYTICS_CONFIG = {
  // Set this to the public URL of server/src/index.ts when it is deployed.
  endpoint: import.meta.env.VITE_ANALYTICS_ENDPOINT ?? '',
}

export const SERVER_TIME_CONFIG = {
  // Use a dedicated endpoint when analytics and game services are hosted separately.
  // Otherwise the time endpoint is derived from VITE_ANALYTICS_ENDPOINT.
  endpoint: import.meta.env.VITE_SERVER_TIME_ENDPOINT ?? '',
  // Browser-accessible UTC fallback for builds without a deployed game server.
  publicEndpoint: import.meta.env.VITE_PUBLIC_TIME_ENDPOINT ?? 'https://utctime.app/api/now',
}
