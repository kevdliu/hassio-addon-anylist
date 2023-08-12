ARG BUILD_FROM
FROM $BUILD_FROM

ENV LANG C.UTF-8

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN set -ex \
  && apk add --no-cache \
  nodejs \
  npm \
  git

COPY package.json /
COPY index.js /
RUN npm install

COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
