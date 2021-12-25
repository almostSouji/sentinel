# Discontinuation

I decided to discontinue this project for multiple reasons. Some of them are:

- Perspective API is not well scalable and might incur fees at a later date, should the project become well known
- Perspective API has a strong bias to falsely flag talk about sexual indentity 
- Perspective API may be useful for PG13 servers, but a strong bias against soft swear words (which are and have beed used non-maliciously in online communities)
- Perspective API is clearly made for longer comments, not for rapid online messaging services like Discord
- Trials with just high-risk flags enabled have proven a high rate of flags that we did not see a need for moderation for, making the use as mod-queue hard
- Alternatives with better trained and purpose-tailored models exist in the moderation bot community. I cannot offer this level of service as a side project

As such I decided to archive this repository and open the source code for anyone to adapt or run as they wish. If you decide to do so, please do not use assets from the projects gits history.

# About

Sentinel watches configured Discord channels for unwanted conversation attributes through usage of the [Perspective API](https://perspectiveapi.com/). Based on server configuration and Attribute probabilities, the bot sets thresholds and emphasis to classify and pre-sort comments posted. Moderators can then review these comments via message links and investigate and handle the situation as appropriate.

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
