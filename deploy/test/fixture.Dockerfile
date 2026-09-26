# Tiny stand-in image for deploy.sh tests: serves its VERSION and has a healthcheck like the real image.
FROM node:24-alpine
ARG VERSION
ENV VERSION=$VERSION
HEALTHCHECK --interval=2s --timeout=2s --start-period=1s --retries=2 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", "-e", "require('http').createServer((q, s) => s.end(process.env.VERSION)).listen(3000)"]
