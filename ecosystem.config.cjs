module.exports = {
  apps: [
    {
      name: 'token-scope',
      script: 'node_modules/next/dist/bin/next',
      // -H 127.0.0.1 binds the listener to the IPv4 loopback only. Any non-local
      // peer (LAN, VPN, container bridge) gets ECONNREFUSED at the kernel before
      // a single byte reaches Next. Safer than middleware filtering — the port
      // simply isn't reachable.
      args: 'start -p 3300 -H 127.0.0.1',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      // Bumped from 300M: refresh work briefly holds a larger in-memory
      // snapshot. 300M was tripping max_memory_restart mid-fetch and leaving
      // the cache empty.
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
        PORT: '3300',
        TOKEN_SCOPE_CACHE_TTL_MS: '300000',
      },
    },
  ],
}
