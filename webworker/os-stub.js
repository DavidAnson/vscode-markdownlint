// @ts-check

"use strict";

module.exports = {
  "cpus": () => [ {} ],
  "EOL": "\n",
  "homedir": () => "/homedir",
  "platform": () => null
};

// Implement setImmediate via setTimeout
globalThis.setImmediate = (/** @type {() => void} */ func) => setTimeout(func, 0);
