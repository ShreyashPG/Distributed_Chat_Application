# Use an official Node.js runtime as a parent image
# Using alpine for a smaller image size
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install app dependencies in production mode
RUN npm install --omit=dev

# Copy the rest of the application source code
COPY . .

# Create the uploads directory if it doesn't exist
# and ensure the node user has permissions
RUN mkdir -p /usr/src/app/uploads && chown -R node:node /usr/src/app/uploads

# Your app runs on port 8080, so expose it
EXPOSE 8080

# Switch to a non-root user for security
USER node

# Define the command to run your app
CMD [ "node", "app.js" ]