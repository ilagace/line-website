var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
  name:'Line_web_site',
  description: 'Line_web_site',
  script: 'D:\Software Development Projects\Line Web Site\app.js'
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install',function(){
  svc.start();
});

svc.install();