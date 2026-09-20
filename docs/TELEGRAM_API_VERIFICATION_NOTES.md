# Telegram API Verification Notes

The connector verification implementation uses the official Telegram Bot API reference: [Telegram Bot API](https://core.telegram.org/bots/api), including `getMe`, `getChat`, and `sendVideo`.

The workspace connector verification flow uses `getMe` to validate the bot token and `getChat` to validate the configured destination. It stores only safe evidence such as verification time, bot username, and chat type. The bot token is never returned in API responses, queue payloads, logs, or verification evidence. The connector secret file is owner-only and stores an encrypted payload rather than a plaintext `botToken` field.

## Fresh Aaditech verification

The fresh **Aaditech Solution** workspace has one Telegram connector and one verified destination. The bot identity was verified successfully through `getMe`; the destination was verified successfully through `getChat`. The provider reported the bot username as `Overseas_Jobs_Alerts_bot` and the destination type as `private`.

Because the destination is currently a **private chat**, it is not yet confirmed to be the intended marketing channel or group. No message, video, or test post was sent. If marketing content should go to a Telegram channel or group, the owner must provide that channel/group chat ID and ensure the bot has the required posting permission; the current private destination can remain as a verified test destination or be replaced through the workspace-scoped connector flow.

The publish worker now binds the verified workspace destination ID into the connector-specific publisher credentials. It first resolves the connector and destination under the authenticated workspace, requires a connected connector and verified destination, reads only the encrypted workspace secret, and does not use a global Telegram channel ID for connector jobs. Focused lint passed, and the release-store and publish-job-store tests passed (5 tests).

Telegram Bot API scheduling is not assumed. The current publisher uploads immediately when the worker executes; future scheduling must be handled by the Content Factory queue/scheduler rather than pretending that Telegram provider-side scheduling is available.
