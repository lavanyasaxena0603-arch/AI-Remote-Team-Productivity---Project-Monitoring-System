module.exports = {
  apps: [
    {
      name: 'flask-api',
      script: 'python3',
      args: 'app.py',
      cwd: '/home/user/webapp/backend',
      env: {
        FLASK_ENV: 'production',
        PYTHONUNBUFFERED: '1'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      restart_delay: 2000,
      max_restarts: 5
    }
  ]
}
