const newlineRe = /\r\n?|\n/g;

function toIndentedLines(string: string): string[] {
  return string.split(newlineRe).map((line) => ` ${line}`);
}

export default function stringifyError(error: any): string {
  const name = error?.name || "[NO NAME]";
  const message = error?.message ?? JSON.stringify(error);
  const stack = error?.stack || "[NO STACK]";
  const cause = error?.cause;
  const errors = error?.errors || [];
  const result: string[] = [`${name}: ${message}`, "stack:"];
  const frames = stack.split(newlineRe);
  const discardFrame = frames[0] === result[0];
  for (const frame of frames.slice(discardFrame ? 1 : 0)) {
    result.push(` ${frame.trim()}`);
  }
  if (cause) {
    result.push("cause:");
    result.push(...toIndentedLines(stringifyError(cause)));
  }
  if (errors.length > 0) {
    result.push("errors:");
    for (const subError of errors) {
      result.push(...toIndentedLines(stringifyError(subError)));
    }
  }
  return result.join("\n");
}
