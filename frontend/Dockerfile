FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Start Next.js development server
# For production, build first: npm run build && npm start
CMD ["npm", "run", "dev"]

