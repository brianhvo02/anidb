import AniDBClient from './AniDBClient.js';
import 'dotenv/config';

if (!process.env.CLIENT_ID)
    throw new Error('No CLIENT_ID provided');
if (!process.env.USERNAME)
    throw new Error('No USERNAME provided');
if (!process.env.PASSWORD)
    throw new Error('No PASSWORD provided');

const client = await AniDBClient.init(process.env.CLIENT_ID, 1, true);

try {
    await client.authenticate(process.env.USERNAME, process.env.PASSWORD);
    const anime = await client.anime(17579);
    console.log(anime);
    // const episode = await client.episode(13538, 'S1');
    // console.log(episode)
    // const groupStatus = await client.groupStatus(13538);
    // console.log(groupStatus);
    // const { file, anime, fileIds } = await client.file(18015, 16312, 1);
    // console.log(file, anime, fileIds);
} catch (e) {
    console.error(e);
} finally {
    await client.disconnect();
}