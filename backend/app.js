// Bridge entry point for Vercel Express service preset
const app = require('./dist/app').default || require('./dist/app').app || require('./dist/app');
module.exports = app;
