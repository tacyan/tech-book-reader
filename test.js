const { app } = require('electron');

console.log('test.js loaded, app type:', typeof app);

if (app) {
  console.log('App is defined');
  app.whenReady().then(() => {
    console.log('App is ready!');
    app.quit();
  });
} else {
  console.log('ERROR: app is undefined');
  process.exit(1);
}
