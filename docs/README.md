# About

Project Sentinel is a private discord application cluster providing utilities to moderators.

- Tai: Sentinel (Toxicity watch): ![discord clyde icon](./images/clyde_20.png) `Tai#0998` ID: `840710376831057920`
- Cell: Sandbox administration: ![discord clyde icon](./images/clyde_20.png) `Cell#9735` ID: `445864099172319242`
- Owner and Developer: ![discord clyde icon](./images/clyde_20.png) `Souji#0001` ID: `83886770768314368`

This project is in a very early alpha state!

# Tai

![Tai Avatar (Tai shiluette with rainbowshield logo)](./images/tai_100.png) Tai watches configured channels  This procedure is based on Attributes that a pre-trained AI model spots in the message content. Based on these Attributes and their probability, the project sets thresholds and emphasis to classify and pre-sort comments posted in specified Discord channels. Moderators can then review these comments via message links and investigate and handle the situation as appropriate.

With the recent addition of buttons the application now supports direct actioning via ban and delete buttons situated on the log message. Button availability depends on strictness settings and the bot's permissions relative to the message author.

In the current state, the project uses the [Perspective API](https://perspectiveapi.com/) to tag messages with Attribute probabilities.

## Setup

- Slash commands require manual setup and are disabled by default.
- `/config`(required): Display (no options) or edit basic settings like logchannel (required), strictness and immunity.
- `/watch <add/remove>` (required): Configure which channels the application watches.
- `/attributes`: Enable or disable attributes to consider.
- `/attributes-nyt`: Enable or disable attributes to consider (these attributes are only trained on a single, rather small data source based on moderation of the New York Times comment section).
- `/custom <add/remove>` Add or remove custom triggers (words or phrases).
- `/notify <add/remove/show>` Configure a user or role to be notified at a certain severity level.
- `/test` Test an input string against your configured attributes and custom triggers

## Terms of Service

1. If you invite and use Sentinel, you acknowledge that this project is in an early alpha stage. I can not guarantee any uptime.
2. Project Sentinel is a hobby project. I will do my best to fix issues as they appear but can not follow a specific update or maintenance schedule.
3. I am not responsible for miss-categorization and the actions following it.
4. I keep the right to terminate this service at any time. I don't need a reason for it, and this decision can only affect a subset of parties.

## Privacy Policy

1. There are currently no plans to save data associated with end-users persistently. This statement might change if karma comes into play.
2. Configuration data is saved persistently and indefinitely. The application uses IDs whenever possible.
3. Perspective API is used with the `doNotStore` parameter, preventing any data retention by third parties.
4. Debug logs to improve the flow of the app may be employed temporarily and may log any data necessary. Log entries of any kind do not persist.
5. Sentinel does not log or otherwise make data visible outside of the application's purpose.
6. The application stores usage data (amount of messages seen and checked, amount of flags triggered per guild) on a 15s interval as time series and under a 15-day cadence. The amount of messages seen metric include messages from channels that Sentinel does not track.

# Cell

![Cell Avatar (Cell shiluette with rainbowbox logo)](./images/cell_100.png) Cell administers Sandbox servers. Servers cann just be operated from the hub, because there is a hard limit of sandboxes due to Discord limitations.
