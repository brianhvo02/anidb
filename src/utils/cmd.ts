import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import AniDBClient from '../AniDBClient.js';
import 'dotenv/config';

const rl = createInterface({ input, output });

if (!process.env.CLIENT_ID)
    throw new Error('No CLIENT_ID provided');
if (!process.env.CLIENT_VERSION)
    throw new Error('No CLIENT_VERSION provided');
const client = await AniDBClient.init(process.env.CLIENT_ID, process.env.CLIENT_VERSION, true);

if (process.env.USERNAME && process.env.PASSWORD)
    console.log('Session ID:', await client.authenticate(process.env.USERNAME, process.env.PASSWORD));

const prompt = async () => {
    const command = await rl.question('> ');
    if (command === '/q')
        return;

    const res = await client.sendCommand(command);
    console.log(res.toString());
    await prompt();
}

await prompt();
rl.close();
await client.disconnect();