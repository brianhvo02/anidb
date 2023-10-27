import { RemoteInfo, Socket, createSocket } from 'node:dgram';
import { Anime, ANIME_MASK, generateAnimeMask } from './Anime.js';
import { DEFAULT_LISTENING_PORT, DEFAULT_API_URL, DEFAULT_API_PORT, PROTOVER, ReturnCode } from './constants.js';
import { EPISODE, Episode } from './Episode.js';
import { GROUP_STATUS, GroupStatus } from './GroupStatus.js';
import { FAnime, FILE_MASK, F_ANIME_MASK, File, generateFAnimeMask, generateFileMask } from './File.js';

const convertParams = (params: Record<string, string>) =>
    Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

export default class AniDBClient {
    private clientId: string;
    private version: number
    private socket: Socket;
    private session?: string;
    private debug: Boolean;

    private constructor(clientId: string, version: number, socket: Socket, debug: boolean) {
        this.clientId = clientId;
        this.version = version;
        this.socket = socket;
        this.debug = debug;
    }

    static async init(
        clientId: string, version: number, debug = false,
        listeningPort = DEFAULT_LISTENING_PORT, 
        apiUrl = DEFAULT_API_URL,
        apiPort = DEFAULT_API_PORT
    ) {
        const socket = createSocket('udp4');

        socket.on('error', err => {
            console.error(`socket error:\n${err.stack}`);
            socket.close();
        });
          
        socket.on('listening', () => {
            const address = socket.address();
            console.log(`socket listening ${address.address}:${address.port}`);
        });

        await new Promise<void>(resolve => socket.bind(listeningPort, resolve));
        await new Promise<void>(resolve => socket.connect(apiPort, apiUrl, resolve));

        return new this(clientId, version, socket, debug);
    }

    private onMessage = (resolve: (value: Buffer | PromiseLike<Buffer>) => void) => 
        (msg: Buffer, _: RemoteInfo) => {
            this.socket.removeListener('message', this.onMessage);
            resolve(msg);
        };

    sendCommand = async (command: string) => 
        new Promise<Buffer>(resolve => {
            if (this.debug)
                console.log(command);
            this.socket.on('message', this.onMessage(resolve));
            this.socket.send(`${command}\r\n`);
        });

    disconnect = async () => {
        await this.logout();
        await new Promise<void>(resolve => this.socket.close(resolve));
    };

    async authenticate(username: string, password: string) {
        const params = convertParams({
            user: username,
            pass: password,
            protover: `${PROTOVER}`,
            client: this.clientId,
            clientver: `${this.version}`,
            enc: 'UTF-8'
        });
        const data = await this.sendCommand(`AUTH ${params}`);
        const returnCode = data.subarray(0, 3).toString('utf-8');

        switch (returnCode) {
            case ReturnCode.LOGIN_ACCEPTED:
                this.session = data.subarray(4, data.indexOf(32, 4)).toString('utf-8');
                return this.session;
            default:
                console.log(data.toString('utf-8'));
        }
    }

    async logout() {
        if (!this.session)
            return;

        const res = await this.sendCommand(`LOGOUT s=${this.session}`);
        console.log(res.toString());
    }
    
    async anime<T extends keyof Anime>(aid: number, fields?: Array<T>) {
        if (!this.session) 
            throw new Error('Not authenticated');

        const keys = fields ?? Object.keys(ANIME_MASK) as Array<keyof Anime>;

        const params = convertParams({
            aid: `${aid}`,
            amask: generateAnimeMask(keys),
            s: this.session
        });
        const data = await this.sendCommand(`ANIME ${params}`);
        const returnCode = data.subarray(0, 3).toString('utf-8');

        switch (returnCode) {
            case ReturnCode.ANIME:
                const raw = data
                    .subarray(data.indexOf(10) + 1, data.lastIndexOf(10))
                    .toString('utf-8')
                    .split('|');

                const entries = keys.map((key, i) => {
                    const Constructor = ANIME_MASK[key][3];
                    if (Constructor !== null) 
                        return [key, raw[i].length ? raw[i].split(/'|,/g).map(val => Constructor(val)) : new ANIME_MASK[key][2](0)];
                    
                    if (ANIME_MASK[key][2] !== Array)
                        return [key, (ANIME_MASK[key][2] as NumberConstructor | StringConstructor)(raw[i] || 0)];
                });

                return Object.fromEntries(entries as any) as Pick<Anime, T>;
            default:
                console.log(data.toString('utf-8'));
                throw new Error('Unexpected result');
        }
    }

    async episode(aid: number, episodeNumber: string | number) {
        if (!this.session) 
            throw new Error('Not authenticated');

        const params = convertParams({
            aid: `${aid}`,
            epno: `${episodeNumber}`,
            s: this.session
        });
        const data = await this.sendCommand(`EPISODE ${params}`);
        const returnCode = data.subarray(0, 3).toString('utf-8');

        switch (returnCode) {
            case ReturnCode.EPISODE:
                const keys = Object.keys(EPISODE) as Array<keyof Episode>;
                const entries = data
                    .subarray(data.indexOf(10) + 1, data.lastIndexOf(10))
                    .toString('utf-8')
                    .split('|')
                    .map((val, i) => [keys[i], EPISODE[keys[i]](val)]);

                return Object.fromEntries(entries) as Episode;
            default:
                console.log(data.toString('utf-8'));
                throw new Error('Unexpected result');
        }
    }

    async groupStatus(aid: number) {
        if (!this.session) 
            throw new Error('Not authenticated');

        const params = convertParams({
            aid: `${aid}`,
            s: this.session
        });
        const data = await this.sendCommand(`GROUPSTATUS ${params}`);
        const returnCode = data.subarray(0, 3).toString('utf-8');

        switch (returnCode) {
            case ReturnCode.GROUP_STATUS:
                const keys = Object.keys(GROUP_STATUS) as Array<keyof GroupStatus>;
                return data
                    .subarray(data.indexOf(10) + 1, data.lastIndexOf(10))
                    .toString('utf-8')
                    .split('\n')
                    .map(line => {
                        const entries = line
                            .split('|')
                            .map((val, i) => [keys[i], GROUP_STATUS[keys[i]](val)]);
                        
                        return Object.fromEntries(entries) as GroupStatus;
                    });
            default:
                console.log(data.toString('utf-8'));
                throw new Error('Unexpected result');
        }
    }

    async file<F extends keyof File, A extends keyof FAnime>(
        aid: number, gid: number, episodeNumber: string | number, 
        fileFields?: Array<F>, animeFields?: Array<A>
    ) {
        if (!this.session) 
            throw new Error('Not authenticated');

        const fileKeys = fileFields ?? Object.keys(FILE_MASK) as Array<keyof File>;
        const animeKeys = animeFields ?? Object.keys(F_ANIME_MASK) as Array<keyof FAnime>;

        const params = convertParams({
            aid: `${aid}`,
            gid: `${gid}`,
            epno: `${episodeNumber}`,
            fmask: generateFileMask(fileKeys),
            amask: generateFAnimeMask(animeKeys),
            s: this.session
        });
        const data = await this.sendCommand(`FILE ${params}`);
        const returnCode = data.subarray(0, 3).toString('utf-8');

        switch (returnCode) {
            case ReturnCode.FILE:
                const raw = data
                    .subarray(data.indexOf(10) + 1, data.lastIndexOf(10))
                    .toString('utf-8')
                    .split('|');

                const fileEntries = fileKeys.map((key, i) => {
                    const Constructor = FILE_MASK[key][3];
                    if (Constructor !== null) 
                        return [key, raw[i].length ? raw[i].split(/'|,/g).map(val => Constructor(val)) : new FILE_MASK[key][2](0)];
                    
                    if (FILE_MASK[key][2] !== Array)
                        return [key, (FILE_MASK[key][2] as NumberConstructor | StringConstructor)(raw[i] || 0)];
                });

                const animeEntries = animeKeys.map((key, j) => {
                    const i = j + fileKeys.length;

                    const Constructor = F_ANIME_MASK[key][3];
                    if (Constructor !== null) 
                        return [key, raw[i].length ? raw[i].split(/'|,/g).map(val => Constructor(val)) : new F_ANIME_MASK[key][2](0)];
                    
                    if (F_ANIME_MASK[key][2] !== Array)
                        return [key, (F_ANIME_MASK[key][2] as NumberConstructor | StringConstructor)(raw[i] || 0)];
                });

                return {
                    file: Object.fromEntries(fileEntries as any) as Pick<File, F>,
                    anime: Object.fromEntries(animeEntries as any) as Pick<FAnime, A>
                };
            case ReturnCode.MULTIPLE_FILES_FOUND:
                return {
                    fileIds: data
                        .subarray(data.indexOf(10) + 1, data.lastIndexOf(10))
                        .toString('utf-8')
                        .split('|')
                }
            default:
                console.log(data.toString('utf-8'));
                throw new Error('Unexpected result');
        }
    }
}