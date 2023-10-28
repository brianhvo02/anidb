import AniDBClient from './AniDBClient.js';
import 'dotenv/config';

if (!process.env.CLIENT_ID)
    throw new Error('No CLIENT_ID provided');
if (!process.env.CLIENT_VERSION)
    throw new Error('No CLIENT_VERSION provided');
if (!process.env.USERNAME)
    throw new Error('No USERNAME provided');
if (!process.env.PASSWORD)
    throw new Error('No PASSWORD provided');

const client = await AniDBClient.init(process.env.CLIENT_ID, process.env.CLIENT_VERSION, true);

try {
    await client.authenticate(process.env.USERNAME, process.env.PASSWORD);
    console.log('Logged in as:', process.env.USERNAME);

    const operations = [
        client.anime(13538)
            .then(console.log)
            .catch(console.error),
        client.anime('Tsurune: The Linking Shot')
            .then(console.log)
            .catch(console.error),

        client.animeDescription(13538)
            .then(console.log)
            .catch(console.error),

        client.episode(13538, 'S1')
            .then(console.log)
            .catch(console.error),
        client.episode('Tsurune: Kazemai High School Kyudo Club', 1)
            .then(console.log)
            .catch(console.error),
        client.episode(208556)
            .then(console.log)
            .catch(console.error),

        client.groupStatus(12012)
            .then(console.log)
            .catch(console.error),

        client.file(3131946)
            .then(console.log)
            .catch(console.error),
        client.file(13538, 16720, 2)
            .then(console.log)
            .catch(console.error),
        client.file(2375919225, '691acfef3558210b031c6b1cb8da6980')
            .then(console.log)
            .catch(console.error),
        client.file(13538, 'samaritan', 3)
            .then(console.log)
            .catch(console.error),
        client.file('Tsurune: Kazemai High School Kyudo Club', 16720, 4)
            .then(console.log)
            .catch(console.error),
        client.file('Tsurune: Kazemai High School Kyudo Club', 'samaritan', 5)
            .then(console.log)
            .catch(console.error),

        client.character(81291)
            .then(character => console.dir(character, { depth: Infinity }))
            .catch(console.error),

        client.creator(200)
            .then(console.log)
            .catch(console.error),

        client.group(7172)
            .then(group => console.dir(group, { depth: Infinity }))
            .catch(console.error),
    ];

    await Promise.all(operations);
} catch (e) {
    console.error(e);
} finally {
    await client.disconnect();
}