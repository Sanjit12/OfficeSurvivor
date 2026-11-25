const path = require("node:path");
const express = require("express");

const DIST_DIR = path.join(__dirname, "dist");

function createApp() {
  const app = express();
  app.disable("x-powered-by");

  app.get("/favicon.ico", (_req, res) => {
    res.status(204).end();
  });

  app.use(express.static(DIST_DIR, { index: "index.html" }));

  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });

  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const host = "0.0.0.0";
  const app = createApp();
  app.listen(port, host, () => {
    console.log(`Office Survivor 3D running at http://${host}:${port}`);
  });
}

module.exports = { createApp };
