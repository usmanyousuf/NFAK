const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const port = Number(process.env.PORT) || 3000;
const root = __dirname;
const listeners = new Set();
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
};

function broadcastPresence() {
  const message = `event: presence\ndata: ${JSON.stringify({ count: listeners.size })}\n\n`;
  listeners.forEach((response) => response.write(message));
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (requestUrl.pathname === "/api/presence") {
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    response.write("retry: 3000\n\n");
    listeners.add(response);
    broadcastPresence();
    request.on("close", () => {
      listeners.delete(response);
      broadcastPresence();
    });
    return;
  }

  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const filePath = path.resolve(root, `.${decodeURIComponent(pathname)}`);
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      response.writeHead(404).end("Not found");
      return;
    }
    const headers = { "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream" };
    const range = request.headers.range;
    if (range && path.extname(filePath) === ".mp3") {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) {
        response.writeHead(416, { "Content-Range": `bytes */${stats.size}` }).end();
        return;
      }
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Math.min(Number(match[2]), stats.size - 1) : stats.size - 1;
      if (start > end || start >= stats.size) {
        response.writeHead(416, { "Content-Range": `bytes */${stats.size}` }).end();
        return;
      }
      response.writeHead(206, {
        ...headers,
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${start}-${end}/${stats.size}`,
        "Content-Length": end - start + 1,
      });
      fs.createReadStream(filePath, { start, end }).pipe(response);
      return;
    }
    response.writeHead(200, { ...headers, "Content-Length": stats.size });
    fs.createReadStream(filePath).pipe(response);
  });
});

const heartbeat = setInterval(() => {
  listeners.forEach((response) => response.write(": heartbeat\n\n"));
}, 20000);

server.on("close", () => clearInterval(heartbeat));
server.listen(port, () => console.log(`NFAK player listening on http://localhost:${port}`));
