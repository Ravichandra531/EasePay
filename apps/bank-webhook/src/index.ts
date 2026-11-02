import { app } from "./app";
const port = Number(process.env.PORT ?? 3003);
const server = app.listen(port);
server.once("listening", () =>
  console.log(`Bank webhook listening on http://localhost:${port}`),
);
server.on("error", (error) => {
  console.error(`Bank webhook could not start on port ${port}:`, error.message);
  process.exitCode = 1;
});
