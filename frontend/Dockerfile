FROM node:20-alpine

WORKDIR /app

# Copy package files first
COPY package*.json ./

RUN npm install

# Copy rest of frontend
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
