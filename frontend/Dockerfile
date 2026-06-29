# ---- Build stage ---------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files first for better caching
COPY package.json .
RUN npm install

COPY . .
RUN npm run build

# ---- Runtime stage --------------------------------------------------------
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5173
ENTRYPOINT ["nginx", "-g", "daemon off;"]