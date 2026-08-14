import http from "node:http";

const listenPort = Number(process.env.PORT || 8080);
const upstreamBaseUrl =
  process.env.OLLAMA_UPSTREAM_URL || "http://ollama:11434";
const apiKey = process.env.NURAI_LOCAL_AI_API_KEY;

if (!apiKey) {
  console.error("NURAI_LOCAL_AI_API_KEY is required");
  process.exit(1);
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function isAuthorized(req) {
  const header = req.headers.authorization || "";
  return header === `Bearer ${apiKey}`;
}

const server = http.createServer(async (req, res) => {
  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;

    const upstreamUrl = new URL(req.url || "/", upstreamBaseUrl);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (
        !value ||
        key.toLowerCase() === "host" ||
        key.toLowerCase() === "authorization"
      ) {
        continue;
      }
      headers.set(key, Array.isArray(value) ? value.join(",") : value);
    }

    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
    });

    res.writeHead(
      upstream.status,
      Object.fromEntries(upstream.headers.entries()),
    );

    if (!upstream.body) {
      res.end();
      return;
    }

    for await (const chunk of upstream.body) {
      res.write(chunk);
    }
    res.end();
  } catch (error) {
    sendJson(res, 502, {
      error: "Local AI upstream unavailable",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

server.listen(listenPort, "0.0.0.0", () => {
  console.log(`NurAI local AI auth proxy listening on ${listenPort}`);
  console.log(`Proxying to ${upstreamBaseUrl}`);
});
