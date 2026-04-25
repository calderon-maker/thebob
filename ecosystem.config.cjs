/**
 * PM2 ecosystem para a VPS BCX (Ubuntu 22.04)
 * Carrega web + worker + scheduler no mesmo process manager
 *
 * Uso:
 *   pm2 start ecosystem.config.cjs
 *   pm2 reload ecosystem.config.cjs --update-env
 *   pm2 save && pm2 startup systemd -u bcx --hp /home/bcx
 */

module.exports = {
  apps: [
    {
      name: 'thebob-web',
      cwd: __dirname + '/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 'max',
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '1G',
      out_file: '/home/bcx/logs/thebob-web.out.log',
      error_file: '/home/bcx/logs/thebob-web.err.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'thebob-worker',
      cwd: __dirname + '/apps/pipeline',
      script: 'dist/worker.js',
      instances: 2,
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '1G',
      out_file: '/home/bcx/logs/thebob-worker.out.log',
      error_file: '/home/bcx/logs/thebob-worker.err.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'thebob-scheduler',
      cwd: __dirname + '/apps/pipeline',
      script: 'dist/scheduler.js',
      cron_restart: '0 2 1 * *',
      autorestart: false,
      env: { NODE_ENV: 'production' },
      out_file: '/home/bcx/logs/thebob-scheduler.out.log',
      error_file: '/home/bcx/logs/thebob-scheduler.err.log',
      time: true,
    },
  ],
};
