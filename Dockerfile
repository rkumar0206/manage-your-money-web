# Stage 1: Build Angular app
FROM node:24.11.1-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production

# Stage 2: Nginx
FROM nginx:alpine

# Clean defaults
RUN rm /etc/nginx/conf.d/default.conf && \
    rm -rf /usr/share/nginx/html/*

# Add custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built Angular app
COPY --from=build /app/dist/manage-your-money-web/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
