# About

<img src="./images/sentinel_100.png" style="float: left; margin-right: 1rem; margin-bottom: 1rem;" alt="Sentinel avatar (Rainbow shield)"/>
Sentinel watches configured Discord channels for unwanted conversation attributes through usage of the [Perspective API](https://perspectiveapi.com/). Based on server configuration and Attribute probabilities, the bot sets thresholds and emphasis to classify and pre-sort comments posted. Moderators can then review these comments via message links and investigate and handle the situation as appropriate.

- Sentinel (Toxicity watch): ![discord clyde icon](./images/clyde_20.png) `Sentinel#0155` ID: `840710376831057920`
- Owner and Developer: ![discord clyde icon](./images/clyde_20.png) `Souji#0001` ID: `83886770768314368`

This project is in a very early alpha state!

## Setup

- Slash commands require manual setup and are disabled by default.
- `/config`(required): Display or edit basic settings like logchannel (required), strictness and immunity.
- `/watch <add/remove>` (required): Configure which channels the application should watch.
- `/attributes`: Enable or disable attributes to watch for.
- `/attributes-nyt`: Enable or disable attributes to watch for (these attributes are only trained on a single, rather small data source based on moderation of the New York Times comment section).
- `/notify <add/remove/show>` Configure a user or role to be notified at a certain severity level.

## Terms of Service

1. If you invite and use any part of Sentinel, you acknowledge that this project is in an early alpha stage. I can not guarantee any uptime.
2. Project Sentinel is a hobby project. I will do my best to fix issues as they appear but cannot follow a specific update or maintenance schedule.
3. I am not responsible for miss-categorization and the actions following it.
4. I keep the right to terminate this service at any time. I don't need a reason for it, and this decision can only affect a subset of parties.

## Privacy Policy

1. If a message is logged the incident is persistently saved with authorId, guildId, messageId, severity level the content triggered, and attributes it triggered above the log threshold (depending on configured strictness applied to the guild)
2. Messages per user and guild are counted in watched channels and associated with IDs
3. Configuration data is saved persistently and indefinitely. The application uses IDs whenever possible.
4. Debug logs to improve the flow of the app may be employed temporarily and may log any data necessary. Log entries of any kind do not persist.
5. Sentinel does not log or otherwise make data visible outside of the application's purpose.
