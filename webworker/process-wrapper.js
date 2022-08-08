// @ts-check

"use strict";

/* eslint-disable node/no-extraneous-require,node/no-missing-require */

// eslint-disable-next-line unicorn/prefer-node-protocol
const processBrowser = require("process/browser");
processBrowser.versions = {
  "node": "0.0"
};
module.exports = processBrowser;
