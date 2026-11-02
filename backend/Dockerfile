FROM node:20-alpine

WORKDIR /app

# Copy dependency definitions and Prisma schema for efficient caching
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

# Copy backend source code
COPY . .

# Ensure Prisma Client is generated
RUN npx prisma generate

# Expose the API port
EXPOSE 5000

# Start the Node.js server
CMD ["npm", "start"]
