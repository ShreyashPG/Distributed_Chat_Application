# --- Stage 1: Build the React Application ---
# Use a Node.js image to build the static files
FROM node:20-alpine as builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Set the backend API URL for the production build
# This will be used by the app inside the container
ARG REACT_APP_API_BASE_URL
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

# Build the production-ready static files
RUN npm run build


# --- Stage 2: Serve the Application with Nginx ---
# Use a lightweight Nginx image to serve the static files
FROM nginx:1.27-alpine

# Set the working directory for Nginx
WORKDIR /usr/share/nginx/html

# Remove the default Nginx welcome page
RUN rm -rf ./*

# Copy the built static files from the 'builder' stage
COPY --from=builder /app/build .

# Copy the custom Nginx configuration
# This ensures that routing is handled correctly by React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for the Nginx server
EXPOSE 80

# Start Nginx in the foreground when the container launches
ENTRYPOINT ["nginx", "-g", "daemon off;"]