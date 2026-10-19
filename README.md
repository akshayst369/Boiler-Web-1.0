# Smart Boiler Monitoring

The existing React dashboard includes email/password login, role-scoped boiler cards, individual boiler details, live readings, override status, and sign-out. The Node bridge stores MQTT telemetry and override events in Firestore.

## Run locally

Use Node.js 22.12 or newer. Install dependencies once:

```sh
npm --prefix boiler-dashboard ci
npm --prefix boiler-mqtt-bridge ci
```

From the project root, run `npm run dev` for the dashboard. In a second terminal, run `npm run bridge` for MQTT ingestion. `npm run lint`, `npm test`, and `npm run build` validate the project. The production output is `boiler-dashboard/dist`.

The bridge reads `boiler-mqtt-bridge/.env`. Existing local broker settings have been preserved there; `.env.example` documents the required variables. Service-account credentials stay server-side and are excluded from Git. Rotate the original broker password and service-account key if this folder has previously been shared publicly.

## Firebase access repair

The original Firestore test-mode rules expired on April 11, 2026. On October 19, 2026, the scoped rules were published through the Firebase console and both existing user profiles were migrated to their Auth UIDs. Legacy records and passwords were preserved.

The migration accepts duplicate legacy profiles only when their role and assignments agree. Conflicting assignments require manual reconciliation.

The deployed `firestore.rules` allows authenticated users to read their own UID profile and their assigned boilers/readings. Owners are scoped by company, inspectors by district, and admins can read all boilers. Browser writes are denied. The Admin SDK bridge continues to write server-side.

For another environment, preview the profile migration before deployment:

```sh
cd boiler-mqtt-bridge
node migrate_profiles.js          # read-only preview
node migrate_profiles.js --apply  # writes UID-based profiles, preserves legacy documents
cd ..
firebase deploy --project smartboiler369 --only firestore:rules,firestore:indexes
```

Use an authenticated Firebase CLI with permission for the project. `firestore.indexes.json` supplies the per-boiler newest-reading indexes; wait for indexes to finish building. Boiler documents must use their `boiler_id` as their document ID (the existing B01, B02 and B03 documents already do).

User profile documents are `users/{Firebase Auth UID}` with `email`, `name`, lowercase `role` (`owner`, `inspector`, `admin`), and the required company/district assignment. `create_users.js` accepts `USER_EMAIL`, `USER_NAME`, `USER_ROLE`, `USER_COMPANY`, `USER_DISTRICT`, and `USER_PASSWORD` through the environment. It creates missing Auth users and writes UID profiles. It never resets existing passwords or prints passwords. New passwords must have at least 12 characters. Do not run it with placeholders.

## MQTT contract

Publish JSON to `boiler/{boiler_id}/telemetry` or `boiler/{boiler_id}/override`. The boiler must be registered in Firestore. The topic supplies the ID; a conflicting payload ID is rejected.

Telemetry supports `temperature_c`, `pressure_bar`, `flow_lpm`, `tds_ppm`, `device_status` (`online` or `offline`), and optional `override`. Numeric strings are accepted; malformed values are rejected. Missing measurements remain unknown. Override messages require a valid boolean, 0/1, or their string forms. A missing override is never assumed to mean OFF.

Timestamps accept epoch seconds, milliseconds, or ISO dates and are stored as epoch milliseconds. Missing timestamps use receive time. The UI supports legacy numeric and Firestore timestamps and marks an online reading stale after two minutes without an update. Adjust the threshold in `src/lib/data.js` if the real device interval is longer. Status is a monitoring indication, not a replacement for hardware safety controls.

The bridge validates TLS, reconnects automatically, requests QoS 1 subscriptions, and retries database writes three times before reporting an error. Devices must publish at QoS 1 for broker redelivery; duplicate log entries remain possible across process restarts. This is not a durable offline message queue.

## Hosting

Build first, then deploy Hosting with the Firebase CLI if desired. `firebase.json` rewrites routes to `index.html`, so direct links to detail pages work. No hosting deployment is performed by local build commands.

## Verification

Eight regression tests cover timestamp compatibility, override ordering, stale status, role scoping, topic IDs and invalid MQTT payloads. Live access checks verified both owner and inspector scopes, anonymous access denial, denial of unfiltered boiler lists, and protection of other user profiles. The owner dashboard and boiler detail metadata load successfully. The telemetry and override indexes were created; final reading verification follows index readiness. Live hardware ingestion requires a connected device and running bridge.

The service account lacks rule-test permissions; rule publication was completed using the authorized Firebase console session.
