# website/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Ensure only ONE of tailwind/postcss configs exists
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/build ./build
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
# SvelteKit adapter-node starts via "node build"
EXPOSE 3000
CMD ["node", "build"]
