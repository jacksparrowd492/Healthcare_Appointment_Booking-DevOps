# -------- Build Stage --------
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./

# Install only production deps later
RUN npm install

COPY . .

# -------- Production Stage --------
FROM node:18-alpine

WORKDIR /app

# Copy only necessary files
COPY --from=build /app /app

# Remove dev dependencies
RUN npm prune --production

# Security best practice
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 5000

CMD ["node", "index.js"]