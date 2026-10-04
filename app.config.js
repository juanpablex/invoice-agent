// Same as app.json, plus a base path for GitHub Pages (set EXPO_BASE_URL=/invoice-agent in CI).
const base = require("./app.json").expo;
module.exports = () => ({
  ...base,
  experiments: { ...base.experiments, ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}) },
});
