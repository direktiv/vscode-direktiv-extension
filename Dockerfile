FROM node

RUN npm install -g vsce

WORKDIR /app

ENTRYPOINT ["vsce"]