require('tsx/cjs');
const fs = require('node:fs/promises');
const path = require('node:path');
const originalWrite = fs.writeFile;
fs.writeFile = async (file, ...args) => {
  if (String(file).endsWith('.json')) {
    await originalWrite(file, '{"version":1,"algorithm":');
    process.send({ event: 'partial-metadata-durable', metadataPath: String(file), pid: process.pid });
    await new Promise(() => {});
  }
  return originalWrite(file, ...args);
};
const media = require(path.join(process.cwd(), 'lib/server/mediaObjectStore.ts'));
process.on('message', async input => {
  try {
    const result = await media.storeMediaObjectFromDataUrl({ ...input, now: new Date(input.now) });
    process.send({ event: 'finished', result });
  } catch (error) {
    process.send({ event: 'error', message: error.message });
  }
});
