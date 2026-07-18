import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { transactionsRoutes } from './modules/transactions/controller';

const app = Fastify({ logger: true });
app.register(cors, { origin: '*' });
app.register(multipart);
app.register(transactionsRoutes);
export default app;