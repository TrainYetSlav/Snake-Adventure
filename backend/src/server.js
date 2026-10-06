import { createApp } from './app.js';
import { readEnvironment } from './config/environment.js';

const config = readEnvironment();
const app = createApp({ config });
const server = app.listen(config.port, config.host, () => {
  console.log(`Snake Adventure API: http://${config.host}:${config.port}/api/v1`);
  console.log('Storage: temporary memory. No database connection is configured.');
});

server.on('error', (error) => {
  console.error(`Unable to start the backend: ${error.message}`);
  process.exitCode = 1;
});

function shutdown() {
  server.close(() => { process.exitCode = 0; });
  server.closeIdleConnections();
  const deadline = setTimeout(() => server.closeAllConnections(), 5000);
  deadline.unref();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
