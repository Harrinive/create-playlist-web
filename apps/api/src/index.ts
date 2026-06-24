import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import Fastify from 'fastify';
import { isAllowedWebOrigin } from './cors.js';
import { loadEnv } from './config.js';
import { registerApiRoutes } from './routes/api.js';
import { createTokenStore } from './store/index.js';

async function main() {
    const env = loadEnv();
    const store = await createTokenStore(env);

    const app = Fastify({ logger: true });

    await app.register(cors, {
        origin: (origin, callback) => {
            if (isAllowedWebOrigin(origin, env)) {
                callback(null, true);
                return;
            }
            callback(new Error('CORS not allowed'), false);
        },
        credentials: true
    });

    await app.register(cookie, {
        secret: env.SESSION_SECRET,
        hook: 'onRequest'
    });

    await registerApiRoutes(app, { env, store });

    await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
