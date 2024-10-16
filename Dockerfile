# Use the official Node.js image as the base image
FROM node:18

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Install PM2 globally
RUN npm install -g pm2

# Copy the rest of the application files
COPY . .

# Expose the application port
EXPOSE 3000

# Command to run the application using PM2
CMD ["pm2-runtime", "start", "src/app/server.js"] 
