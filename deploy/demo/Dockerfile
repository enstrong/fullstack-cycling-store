FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY api-server/package.json api-server/package-lock.json ./api-server/
RUN cd api-server && npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY api-server ./api-server
COPY shared ./shared
COPY dist ./dist
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=5001
CMD ["node", "api-server/index.js"]
