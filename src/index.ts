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
    console.log('Logged in as:', process.env.USERNAME);

    // const anime1 = await client.anime(13538);
    // console.log(anime1);
    // const anime2 = await client.anime('Tsurune: The Linking Shot');
    // console.log(anime2);

    // const animeDesc = await client.animeDescription(13538);
    // console.log(animeDesc);

    // const episode1 = await client.episode(13538, 'S1');
    // console.log(episode1);
    // const episode2 = await client.episode('Tsurune: Kazemai High School Kyudo Club', 1);
    // console.log(episode2);
    // const episode3 = await client.episode(208556);
    // console.log(episode3);

    // const groupStatus = await client.groupStatus(12012);
    // console.log(groupStatus);

    // const file1 = await client.file(3131946);
    // console.log(file1);
    // const file2 = await client.file(13538, 16720, 2);
    // console.log(file2);
    // const file3 = await client.file(2375919225, '691acfef3558210b031c6b1cb8da6980');
    // console.log(file3);
    // const file4 = await client.file(13538, 'samaritan', 3);
    // console.log(file4);
    // const file5 = await client.file('Tsurune: Kazemai High School Kyudo Club', 16720, 4);
    // console.log(file5);
    // const file6 = await client.file('Tsurune: Kazemai High School Kyudo Club', 'samaritan', 5);
    // console.log(file6);

    // const character = await client.character(81291);
    // console.dir(character, { depth: Infinity });

    // const creator = await client.creator(200);
    // console.log(creator);

    // const group = await client.group(7172);
    // console.dir(group, { depth: Infinity });
} catch (e) {
    console.error(e);
} finally {
    await client.disconnect();
}