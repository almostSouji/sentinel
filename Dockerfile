FROM node:16-alpine
LABEL name "tai"
LABEL version "0.0.0"
LABEL maintainer "almostSouji <https://github.com/almostSouji>"
ENV DISCORD_CLIENT_ID=\
	DISCORD_GUILD_ID=\
	DISCORD_TOKEN=\
	PERSPECTIVE_TOKEN=\
	FORCE_COLOR=1
WORKDIR /usr/tai
COPY package.json ./
RUN apk add --update \
	&& apk add --no-cache ca-certificates \
	&& apk add --no-cache --virtual .build-deps git curl build-base python3 g++ make \
	&& npm i \
	&& apk del .build-deps
COPY . .
RUN npm run build
CMD ["npm", "run", "start"]