/**
 * pm2 config for the VM: every start/restart rebuilds first, so `git pull && pm2 restart fleshfall`
 * always runs fresh code.
 *
 *   pm2 start ecosystem.config.cjs && pm2 save      (once; replaces the old `dist/index.js` app)
 *   pm2 restart fleshfall                           (build + start)
 *
 * `exec` replaces bash with node so pm2's SIGINT reaches the bot directly and the JSON store flushes.
 */
module.exports = {
  apps: [
    {
      name: 'fleshfall',
      cwd: __dirname,
      script: 'bash',
      args: ['-c', 'npm run build && exec node dist/index.js'],
      interpreter: 'none',
      kill_timeout: 8000, // time to flush db.json on shutdown
      restart_delay: 5000, // don't hammer a failing build
      max_restarts: 10,
    },
  ],
};
