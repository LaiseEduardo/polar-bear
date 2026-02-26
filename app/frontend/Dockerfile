FROM node:22

WORKDIR /app

# Install dependencies
COPY frontend/package.json frontend/package-lock.json ./

RUN npm install

# Copy the application files
COPY frontend/ .

# Expose the frontend port
EXPOSE 4200

CMD ["npm", "start"]
