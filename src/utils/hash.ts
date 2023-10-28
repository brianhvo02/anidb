import { createHash } from 'crypto';
import { open } from 'fs/promises';
import AniDBClient from '../AniDBClient.js';
import 'dotenv/config';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const isCLI = resolve(fileURLToPath(import.meta.url)).includes(resolve(process.argv[1]));

export const generateED2K = async (path: string) => {
    const file = await open(path, 'r');
    const { size } = await file.stat();
    
    const chunks = Math.ceil(size / 9728000);
    
    if (chunks === 1) {
        const buf = Buffer.alloc(size);
        await file.read(buf, 0, size);
        const hash = createHash('md4');
        hash.update(buf);
        const ed2k = hash.digest('hex');

        return { size, ed2k }
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

    await file.close();
    
    const hash = createHash('md4');
    hashes.forEach(h => hash.update(h));
    const ed2k = hash.digest('hex');

    return { size, ed2k };
}

if (isCLI) {
    const { size, ed2k } = await generateED2K(process.argv[2]);

    console.log('Size:', size);
    console.log('Hash:', ed2k);

    if (!process.env.CLIENT_ID || !process.env.USERNAME || !process.env.PASSWORD)
        process.exit(0);

    console.log('Searching file info in AniDB...')
    const client = await AniDBClient.init(process.env.CLIENT_ID, 1);

    try {
        await client.authenticate(process.env.USERNAME, process.env.PASSWORD);

        const file = await client.file(size, ed2k);
        console.log(file);
    } catch (e) {
        console.error(e);
    } finally {
        await client.disconnect();
    }
}