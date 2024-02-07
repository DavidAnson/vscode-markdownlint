// @ts-check

/**
 * String-ifies an Error (or AggregateError) object.
 * @param {Error} error Error object to string-ify.
 * @returns {String} Error details.
 */
function errorString (error) {
	// eslint-disable-next-line func-style, unicorn/prevent-abbreviations, unicorn/consistent-function-scoping
	const stringifyError = (err) => {
		const nameMessage = `${err.name}: ${err.message}`;
		const stack = err.stack || "[NO STACK]";
		const result = stack.startsWith(nameMessage) ? stack : `${nameMessage}\n${stack}`;
		return result;
	};
	const errors = [
		error,
		// @ts-ignore
		...(error.errors || [])
	];
	// eslint-disable-next-line unicorn/prevent-abbreviations
	const result = errors.map((err) => stringifyError(err)).join("\n");
	return result;
}

export default errorString;
