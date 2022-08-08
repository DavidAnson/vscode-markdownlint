// @ts-check

"use strict";

module.exports = {
  "cpus": () => [ {} ],
  "platform": () => null
};

// Implement setImmediate via setTimeout
globalThis.setImmediate = (func) => setTimeout(func, 0);
