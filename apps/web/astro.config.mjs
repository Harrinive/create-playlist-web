import { defineConfig } from 'astro/config';

export default defineConfig({
    site: 'https://vibelist.dychen.net',
    server: {
        // Match API dev host so session cookies work (127.0.0.1, not localhost).
        host: '127.0.0.1'
    }
});
