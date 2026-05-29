import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://2ba363148ca643690f5d73c31a334110@o4511441095294976.ingest.us.sentry.io/4511441100734464",

  tracesSampleRate: 1.0,

  sendDefaultPii: true,
});

export default Sentry;