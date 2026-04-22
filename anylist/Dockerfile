FROM node:18-alpine

WORKDIR /anylist

COPY package.json .
COPY index.js .

RUN npm install

COPY run-generic.sh .
RUN chmod a+x ./run-generic.sh

CMD [ "./run-generic.sh" ]
EXPOSE 9000