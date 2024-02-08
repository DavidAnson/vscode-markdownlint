// @ts-check

/**
 * String-ifies an Error (or AggregateError) object.
 * @param {Error} error Error object to string-ify.
 * @param {Number} [indent] Spaces to start indent.
 * @returns {String} Error details.
 */
function stringifyError (error, indent = 0) {
	const name = error?.name || "[NO NAME]";
	const message = error?.message || JSON.stringify(error);
	const stack = error?.stack || "[NO STACK]";
	// @ts-ignore
	const cause = error?.cause;
	// @ts-ignore
	const errors = error?.errors || [];
	const result = [ `${name}: ${message}`, "stack:" ];
	const frames = stack.split(/\r\n?|\n/g);
	for (const frame of frames.slice((frames[0] === result[0]) ? 1 : 0)) {
		result.push(` ${frame.trim()}`);
	}
	if (cause) {
		result.push("cause:")
		result.push(stringifyError(cause, indent + 1))
	}
	if (errors.length > 0) {
		result.push("errors:")
		for (const err of errors) {
			result.push(stringifyError(err, indent + 1))
		}
	}
	return result.map((s) => `${" ".repeat(indent)}${s}`).join("\n");
}

export default stringifyError;
