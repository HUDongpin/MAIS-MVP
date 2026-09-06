const forbidden = ["--execute", "--formal-run", "--live-provider", "--production", "--deploy"]
  .find((flag) => process.argv.includes(flag));

if (forbidden) {
  process.stderr.write(`${forbidden} is not authorized; F2-R contains no formal execution entrypoint.\n`);
  process.exitCode = 2;
} else {
  process.stdout.write("F2-R formal preflight contract only: no formal execution entrypoint is present.\n");
}
