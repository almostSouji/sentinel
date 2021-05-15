# About

![Sentinel Icon (purple shield with exclamation mark)](./images/sentinel_no_bg_100.png) Project Sentinel is a private discord bot watching Discord channels for toxicity and alerting moderators of incidents. This procedure is based on Attributes that a pre-trained AI model spots in the message content it is provided. Based on these Attributes and their probability, the project sets thresholds and emphasis to classify and pre-sort comments posted in specified Discord channels. Moderators can then review these comments via message links and investigate and handle the situation as appropriate.

This project is in a very early alpha state!

- Project Sentinel: ![discord clyde icon](./images/clyde_20.png) `Sentinel#9223` ID: `840710376831057920`
- Owner and Developer: ![discord clyde icon](./images/clyde_20.png) `Souji#0001` ID: `83886770768314368`

In the current state, the project uses the [Perspective API](https://perspectiveapi.com/) to tag messages with Attribute probabilities.

# Terms of Service

1. If you invite and use Project Sentinel you acknowledge that this project is in an early alpha stage. I can not guarantee any uptime.
2. Project Sentinel is a hobby project. I will do my best to fix issues as they appear but can not follow a specific update or maintenance schedule.
3. I am not responsible for miss-categorization and the actions following it.
4. Settings can not be dynamically changed and require backend changes. Please do not expect immediate changes at all times and pick your settings carefully.
5. I keep the right to terminate this service at any time. I don't need a reason for it, and this decision can only affect a subset of parties.

# Privacy Policy

1. There are currently no plans to save data associated with end-users persistently. This statement might change if karma comes into play.
2. To set Sentinel up, I will require a set of data, which the server staff allows me to save persistently.
3. Perspective API is used with the `doNotStore` parameter, preventing any data retention by third parties.
4. Debug logs to improve the flow of the app may be employed temporarily and may log any data necessary. Log entries of any kind do not persist.
5. Sentinel does not log or otherwise make data visible outside of the application's purpose.
