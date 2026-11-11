# ---- dev: Vite dev server with hot reload (source is bind-mounted by docker compose) ----
FROM node:22-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ---- build: produce the static site ----
FROM dev AS build
RUN npm run build

# ---- prod: serve the built site with nginx ----
FROM nginx:1.27-alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
