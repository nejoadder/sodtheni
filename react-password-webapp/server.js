import http from "http";

const PORT = 3001;

const server = http.createServer((req, res) => {
  // Enkel CORS så frontend (t.ex. Vite på 5173) kan anropa API:t.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/api/post") {
    const data = {
      title: "Hej från Node-backend",
      body: "Detta svar kommer från server.js i ditt projekt."
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Endpoint hittades inte." }));
});

server.listen(PORT, () => {
  console.log(`Backend kör på http://localhost:${PORT}`);
});
