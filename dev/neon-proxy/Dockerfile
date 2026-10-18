FROM node:22-alpine
WORKDIR /app
RUN npm init -y >/dev/null && npm install pg@8 ws@8 --omit=dev --no-audit --no-fund
COPY server.js .
CMD ["node", "server.js"]
