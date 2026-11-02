import http from "node:http";

const server = http.createServer((req, res) => {
  if (req.url !== "/" || req.method !== "GET") {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  // Intentionally weak response headers for the local classroom scanner demo.
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Server": "DemoWeb/1.2.3" });
  res.end("<!doctype html><html><head><title>Demo Web Server</title></head><body><h1>Local security lab</h1><p>This intentionally minimal page is served locally for the classroom scanner demo.</p></body></html>");
});

server.listen(4173, "127.0.0.1", () => console.log("Local demo web server ready at http://127.0.0.1:4173"));
process.on("SIGINT", () => server.close(() => process.exit(0)));
