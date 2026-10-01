import { defineRailway, preserve, project, service } from "railway/iac";

// Infrastructure as code for the Spring Boot backend (replaces the deprecated railway.json).
// This file manages only the backend service; the Postgres service stays dashboard-managed,
// so it is referenced through Railway's `${{Postgres.*}}` template variables rather than declared here.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "backend";

export default defineRailway(() => {
  const backend = service("backend", {
    builder: "DOCKERFILE",
    dockerfilePath: "Dockerfile",
    healthcheck: "/api/entries",
    healthcheckTimeout: 120,
    restartPolicyType: "ON_FAILURE",
    restartPolicyMaxRetries: 5,
    env: {
      // Database: references resolved by Railway at deploy time
      DATABASE_URL: "jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}",
      DATABASE_USER: "${{Postgres.PGUSER}}",
      DATABASE_PASSWORD: "${{Postgres.PGPASSWORD}}",
      RAILWAY_DOCKERFILE_PATH: "Dockerfile",
      // Secrets and personal data are set in the dashboard and only preserved here, never committed.
      // TMDB_ACCESS_TOKEN (v4) is preferred over TMDB_API_KEY; ADMIN_GOOGLE_SUBS over ADMIN_EMAILS.
      TMDB_ACCESS_TOKEN: preserve(),
      TMDB_API_KEY: preserve(),
      GOOGLE_CLIENT_ID: preserve(),
      ADMIN_GOOGLE_SUBS: preserve(),
      ADMIN_EMAILS: preserve(),
    },
  });
  return project("my-watchlist", {
    resources: [backend],
  });
});
