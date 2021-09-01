FROM node:14.5.0-alpine3.12

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
# copy both package and package-lock files
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .
RUN npm run build

# Setup process.env
#ENV EXAMPLE_ENV=$EXAMPLE_ENV

# Setup wait utility, see Github page for env options
#ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.7.3/wait /wait
#RUN chmod +x /wait

# Launch
EXPOSE 8080
# Uncomment to use wait utility
# CMD /wait && npm start
CMD npm start