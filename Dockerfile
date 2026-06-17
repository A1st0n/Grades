# ---- Build stage ----
# Installs dependencies and produces the static production build.
FROM node:24-alpine AS build
WORKDIR /app

# Copy manifests first so Docker can cache the npm install layer.
COPY package*.json ./
RUN npm ci

# Copy the rest of the source and build.
COPY . .
RUN npm run build

# ---- Serve stage ----
# Serves the static build output with nginx. Tiny final image, no Node needed.
FROM nginx:alpine AS serve
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
