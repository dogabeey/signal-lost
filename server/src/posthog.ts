import { PostHog } from 'posthog-node'

const projectToken = process.env.POSTHOG_PROJECT_TOKEN
const host = process.env.POSTHOG_HOST

function reportMissingConfiguration(variableName: string): void {
  if (process.env.NODE_ENV !== 'production') {
    console.error(
      `${variableName} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${variableName} is configured`,
    )
  }
}

if (!projectToken) {
  reportMissingConfiguration('POSTHOG_PROJECT_TOKEN')
}

if (!host) {
  reportMissingConfiguration('POSTHOG_HOST')
}

export const posthog = projectToken && host
  ? new PostHog(projectToken, { host, enableExceptionAutocapture: true })
  : undefined
