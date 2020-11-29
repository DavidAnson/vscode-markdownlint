"use strict";

const path = require("path");
const Mocha = require("mocha");
const glob = require("glob");

function run () {
	// Create the mocha test
	const mocha = new Mocha({
		"ui": "tdd",
		"color": true
	});

	const testsRoot = path.resolve(__dirname, "..");

	return new Promise((resolve, reject) => {
		// eslint-disable-next-line consistent-return
		glob("**/**.test.js", {"cwd": testsRoot}, (err, files) => {
			if (err) {
				return reject(err);
			}

			// Add files to the test suite
			files.forEach((file) => mocha.addFile(path.resolve(testsRoot, file)));

			try {
				// Run the mocha test
				mocha.run((failures) => {
					if (failures > 0) {
						reject(new Error(`${failures} tests failed.`));
					} else {
						resolve();
					}
				});
			} catch (runError) {
				console.error(runError);
				reject(runError);
			}
		});
	});
}

module.exports = {
	run
};
