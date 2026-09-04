module.exports = {
  apps: [
    {
      name: 'pc-alley-frontend',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',
      node_args: '--max-old-space-size=1024',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0'
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        HOSTNAME: '0.0.0.0'
      },
      // Persistent logging with timestamping and stack traces
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      time: true
    }
  ]
};
