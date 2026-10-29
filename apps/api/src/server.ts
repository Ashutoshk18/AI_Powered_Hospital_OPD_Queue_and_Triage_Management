import { app, prisma } from './app';
import { config } from './config';

const server = app.listen(config.port, () => {
  console.log(` Hospital OPD API server running at http://localhost:${config.port}${config.apiPrefix}`);
  console.log(` Health probe active at http://localhost:${config.port}${config.apiPrefix}/health`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Gracefully shutting down...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Database disconnected. Process exited.');
    process.exit(0);
  });
});
