import { createHash } from 'crypto';
import { open } from 'fs/promises';

const file = await open(process.argv[2], 'r');
const { size } = await file.stat();

const chunks = Math.ceil(size / 9728000);

if (chunks === 1) {
    const buf = Buffer.alloc(size);
    await file.read(buf, 0, size);
    const hash = createHash('md4');
    hash.update(buf);
    console.log('Size:', size);
    console.log('Hash:', hash.digest('hex'));
    process.exit(0);
}

const lastChunkSize = size % 9728000;

const hashes = [];

for (let i = 0; i < chunks; i++) {
    console.clear();
    console.log(`Progress: ${Math.round(i / chunks * 100)}%`);
    const buf = Buffer.alloc(i === chunks - 1 ? lastChunkSize : 9728000);
    await file.read(buf, 0, i === chunks - 1 ? lastChunkSize : 9728000, i * 9728000);
    const hash = createHash('md4');
    hash.update(buf);
    hashes.push(hash.digest());
}

const hash = createHash('md4');
hashes.forEach(h => hash.update(h));
console.log('Size:', size);
console.log('Hash:', hash.digest('hex'));