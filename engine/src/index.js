import { startServer } from './server.js';
import { main as worker } from './worker.js';
startServer();
worker();
