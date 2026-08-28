import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withSentryConfig(nextConfig, {
  // Suppress Sentry CLI output during local builds
  silent: true,
  org: "sunnfun-crm",
  project: "sunnfun-crm-saas",
});
