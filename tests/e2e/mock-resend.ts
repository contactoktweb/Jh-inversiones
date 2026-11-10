import http from "node:http";

/**
 * Servidor que imita la API de Resend durante las pruebas (RESEND_BASE_URL apunta aquí).
 * Guarda cada correo recibido y los expone en GET /__sent para verificarlos.
 */
export default async function globalSetup() {
  const sent: Array<{ from: string; to: string | string[]; subject: string; html: string; auth: string; attachments?: unknown[] }> = [];
  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/__sent") { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(sent)); return; }
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      if (req.method === "POST" && req.url === "/emails") {
        const email = JSON.parse(body || "{}");
        sent.push({ from: email.from, to: email.to, subject: email.subject, html: email.html, attachments: email.attachments, auth: String(req.headers.authorization || "") });
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ id: `mock_${sent.length}` }));
        return;
      }
      res.statusCode = 404; res.end("{}");
    });
  });
  await new Promise<void>(resolve => server.listen(4010, "127.0.0.1", resolve));
  return async () => { await new Promise(resolve => server.close(resolve)); };
}
