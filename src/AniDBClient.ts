import { RemoteInfo, Socket, createSocket } from 'node:dgram';
import { Anime, ANIME_MASK, AnimeResult, generateAnimeMask } from './payloads/Anime.js';
import { DEFAULT_LISTENING_PORT, DEFAULT_API_URL, DEFAULT_API_PORT, PROTOVER, ReturnCode, TAG_LENGTH, TAG_CHARACTERS } from './constants.js';
import { EPISODE, Episode } from './payloads/Episode.js';
import { GROUP_STATUS, GroupStatus } from './payloads/GroupStatus.js';
import { FAnime, FILE_MASK, F_ANIME_MASK, File, FileResult, generateFAnimeMask, generateFileMask } from './payloads/File.js';
import { ANIME_BLOCK, AnimeBlock, CHARACTER, Character } from './payloads/Character.js';
import { CREATOR, Creator } from './payloads/Creator.js';
import { GROUP, GROUP_RELATION, Group, GroupRelation } from './payloads/Group.js';
import { ANIME_DESCRIPTION, AnimeDescription } from './payloads/AnimeDescription.js';

const convertParams = (params: Record<string, string>) =>
    Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

interface Command {
    command: string;
    resolve: (value: Buffer | PromiseLike<Buffer>) => void;
}

export default class AniDBClient {
    private clientId: string;
    private version: number
    private socket: Socket;
    private session?: string;
    private debug: Boolean;

    private commandQueue: Command[] = [];
    private commandHistory: Record<string, Command> = {};

    private timer: NodeJS.Timeout;

    private constructor(clientId: string, version: number, socket: Socket, debug: boolean) {
        socket.on('message', msg => {
            const tag = msg.subarray(0, 5).toString('utf-8');
            this.commandHistory[tag].resolve(msg);
        });

        this.timer = setInterval(() => {
            const commandBlock = this.commandQueue.shift();
            if (commandBlock)
                socket.send(commandBlock.command);
        }, 4000);

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

    private generateTag(): string {
        const tag = [...Array(TAG_LENGTH).keys()]
            .reduce(acc => acc + TAG_CHARACTERS.charAt(Math.random() * TAG_CHARACTERS.length), '');
        
        return Object.keys(this.commandQueue).includes(tag)
            ? this.generateTag()
            : tag;
    }

    sendCommand = async (command: string) => 
        new Promise<Buffer>(resolve => {
            const tag = this.generateTag();
            const taggedCommand = command + (
                command.includes('=')
                    ? `&tag=${tag}`
                    : `tag=${tag}`
            );

            if (this.debug)
                console.log(taggedCommand);

            const commandBlock = {
                command: `${taggedCommand}\r\n`,
                resolve
            }

            this.commandHistory[tag] = commandBlock;
            this.commandQueue.push(commandBlock);
        });

    disconnect = async () => {
        await this.logout();
        clearTimeout(this.timer);
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
        const returnCode = data.subarray(6, 9).toString('utf-8');

        switch (returnCode) {
            case ReturnCode.LOGIN_ACCEPTED:
                this.session = data.subarray(10, data.indexOf(32, 10)).toString('utf-8');
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

    async anime<T extends keyof Anime>(aid: number, fields?: T[]): Promise<AnimeResult<T>>;
    async anime<T extends keyof Anime>(aname: string, fields?: T[]): Promise<AnimeResult<T>>;
    async anime<T extends keyof Anime>(a: number | string, fields?: T[]) {
        if (!this.session) 
            throw new Error('Not authenticated');

        const keys = (Object.keys(ANIME_MASK) as T[]).filter(key => fields?.includes(key) ?? true);

        const rawParams: Record<string, string> = {
            amask: generateAnimeMask(keys),
            s: this.session
        }
        rawParams[typeof a === 'number' ? 'aid' : 'aname'] = `${a}`;
        const params = convertParams(rawParams);
        
        const data = await this.sendCommand(`ANIME ${params}`);
        const returnCode = data.subarray(6, 9).toString('utf-8');

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
                        return [key, (ANIME_MASK[key][2] as NumberConstructor | StringConstructor)(raw[i] || '')];
                });

                return Object.fromEntries(entries as any) as Pick<Anime, T>;
            case ReturnCode.NO_SUCH_ANIME:
                return;
            default:
                console.log(data.toString('utf-8'));
                throw new Error('Unexpected result');
        }
    }

    async animeDescription(aid: number): Promise<string | undefined>;
    async animeDescription(aid: number, partNum: number): Promise<string | undefined>;
    async animeDescription(aid: number, partNum?: number) {
        if (!this.session) 
            throw new Error('Not authenticated');

        const params = convertParams({
            aid: `${aid}`,
            part: `${partNum ?? 0}`,
            s: this.session
        });
        const data = await this.sendCommand(`ANIMEDESC ${params}`);
        const returnCode = data.subarray(6, 9).toString('utf-8');

        switch (returnCode) {
            case ReturnCode.ANIME_DESCRIPTION:
                const keys = Object.keys(ANIME_DESCRIPTION) as Array<keyof AnimeDescription>;
                const entries = data
                    .subarray(data.indexOf(10) + 1, data.lastIndexOf(10))
                    .toString('utf-8')
                    .split('|')
                    .map((val, i) => [keys[i], ANIME_DESCRIPTION[keys[i]](val)]);

                const { currentPart, maxParts, description } = Object.fromEntries(entries) as AnimeDescription;
                if (currentPart + 1 === maxParts)
                    return description;
                else
                    return description + this.animeDescription(aid, currentPart + 1);
            case ReturnCode.NO_SUCH_ANIME:
            case ReturnCode.NO_SUCH_DESCRIPTION:
                return;
            default:
                console.log(data.toString('utf-8'));
                throw new Error('Unexpected result');
        }
    }

    async episode(eid: number): Promise<Episode | undefined>;
    async episode(aname: string, episodeNumber: string | number): Promise<Episode | undefined>;
    async episode(aid: number, episodeNumber: string | number): Promise<Episode | undefined>;
    async episode(a: string | number, episodeNumber?: string | number) {
        if (!this.session) 
            throw new Error('Not authenticated');

        const rawParams: Record<string, string> = {
            s: this.session
        }
        rawParams[
            typeof a === 'number' 
                ? episodeNumber == undefined
                    ? 'eid'
                    : 'aid'
                : 'aname'
        ] = `${a}`;
        if (episodeNumber)
            rawParams['epno'] = `${episodeNumber}`;
        const params = convertParams(rawParams);

        const data = await this.sendCommand(`EPISODE ${params}`);
        const returnCode = data.subarray(6, 9).toString('utf-8');

        switch (returnCode) {
            case ReturnCode.EPISODE:
                const keys = Object.keys(EPISODE) as Array<keyof Episode>;
                const entries = data
                    .subarray(data.indexOf(10) + 1, data.lastIndexOf(10))
                    .toString('utf-8')
                    .split('|')
                    .map((val, i) => [keys[i], EPISODE[keys[i]](val)]);

                return Object.fromEntries(entries) as Episode;
            case ReturnCode.NO_SUCH_EPISODE:
                return;
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
        const returnCode = data.subarray(6, 9).toString('utf-8');

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
            case ReturnCode.NO_SUCH_GROUP:
            case ReturnCode.NO_SUCH_ANIME:
                return;
            default:
                console.log(data.toString('utf-8'));
                throw new Error('Unexpected result');
        }
    }

    async file<F extends keyof File, A extends keyof FAnime>(
        fid: number,
        fileFields?: F[], animeFields?: A[]
    ): Promise<Pick<File, F> | Pick<FAnime, A> | string[] | undefined>;

    async file<F extends keyof File, A extends keyof FAnime>(
        size: number, ed2k: string,
        fileFields?: F[], animeFields?: A[]
    ): Promise<FileResult<F, A>>;

    async file<F extends keyof File, A extends keyof FAnime>(
        aname: string, gname: string, episodeNumber: string | number, 
        fileFields?: F[], animeFields?: A[]
    ): Promise<FileResult<F, A>>;

    async file<F extends keyof File, A extends keyof FAnime>(
        aname: string, gid: number, episodeNumber: string | number, 
        fileFields?: F[], animeFields?: A[]
    ): Promise<FileResult<F, A>>;

    async file<F extends keyof File, A extends keyof FAnime>(
        aid: number, gname: string, episodeNumber: string | number, 
        fileFields?: F[], animeFields?: A[]
    ): Promise<FileResult<F, A>>;
    
    async file<F extends keyof File, A extends keyof FAnime>(
        aid: number, gid: number, episodeNumber: string | number, 
        fileFields?: F[], animeFields?: A[]
    ): Promise<FileResult<F, A>>;

    async file<F extends keyof File, A extends keyof FAnime>(
        param1: number | string, 
        param2?: number | string | F[], 
        param3?: string | number | F[] | A[], 
        param4?: F[] | A[], 
        param5?: A[]
    ) {
        if (!this.session) 
            throw new Error('Not authenticated');

        const rawParams: Record<string, string> = {
            s: this.session
        }

        let fileKeys: (F | 'fid')[];
        let animeKeys: A[];

        switch (typeof param3) {
            case 'string':
            case 'number':
                rawParams[
                    typeof param1 === 'number'
                        ? 'aid'
                        : 'aname'
                ] = `${param1}`;
                rawParams[
                    typeof param2 === 'number'
                        ? 'gid'
                        : 'gname'
                ] = `${param2}`;
                rawParams['epno'] = `${param3}`;

                fileKeys = (Object.keys(FILE_MASK) as F[])
                    .filter(key => ((param4 as F[] | undefined)?.includes(key as F) ?? true) || key === 'fid');
                animeKeys = (Object.keys(F_ANIME_MASK) as A[])
                    .filter(key => param5?.includes(key) ?? true);
                break;
            default:
                if (typeof param2 === 'string') {
                    rawParams['size'] = `${param1}`;
                    rawParams['ed2k'] = `${param2}`;
                    fileKeys = (Object.keys(FILE_MASK) as F[])
                        .filter(key => ((param3 as F[] | undefined)?.includes(key) ?? true) || key === 'fid');
                    animeKeys = (Object.keys(F_ANIME_MASK) as A[])
                        .filter(key => (param4 as A[] | undefined)?.includes(key) ?? true);
                } else {
                    rawParams['fid'] = `${param1}`;
                    fileKeys = (Object.keys(FILE_MASK) as F[])
                        .filter(key => ((param2 as F[] | undefined)?.includes(key) ?? true) || key === 'fid');
                    animeKeys = (Object.keys(F_ANIME_MASK) as A[])
                        .filter(key => (param3 as A[] | undefined)?.includes(key) ?? true);
                }
        }

        rawParams['fmask'] = generateFileMask(fileKeys);
        rawParams['amask'] = generateFAnimeMask(animeKeys);
        const params = convertParams(rawParams);

        const data = await this.sendCommand(`FILE ${params}`);
        const returnCode = data.subarray(6, 9).toString('utf-8');

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
                    
                    return [key, (FILE_MASK[key][2] as NumberConstructor | StringConstructor)(raw[i] || '')];
                });

                const animeEntries = animeKeys.map((key, j) => {
                    const i = j + fileKeys.length;

                    const Constructor = F_ANIME_MASK[key][3];
                    if (Constructor !== null) 
                        return [key, raw[i].length ? raw[i].split(/'|,/g).map(val => Constructor(val)) : new F_ANIME_MASK[key][2](0)];
                    
                    return [key, (F_ANIME_MASK[key][2] as NumberConstructor | StringConstructor)(raw[i] || '')];
                });

                return Object.fromEntries(fileEntries.concat(animeEntries)) as Pick<File, F> | Pick<FAnime, A>;
            case ReturnCode.MULTIPLE_FILES_FOUND:
                return data
                    .subarray(data.indexOf(10) + 1, data.lastIndexOf(10))
                    .toString('utf-8')
                    .split('|');
            case ReturnCode.NO_SUCH_FILE:
                return;
            default:
                console.log(data.toString('utf-8'));
                throw new Error('Unexpected result');
        }
    }

    async character(charid: number) {
        if (!this.session) 
            throw new Error('Not authenticated');

        const params = convertParams({
            charid: `${charid}`,
            s: this.session
        });
        const data = await this.sendCommand(`CHARACTER ${params}`);
        const returnCode = data.subarray(6, 9).toString('utf-8');

        switch (returnCode) {
            case ReturnCode.CHARACTER:
                const keys = Object.keys(CHARACTER) as Array<keyof Character>;
                const entries = data
                    .subarray(data.indexOf(10) + 1, data.lastIndexOf(10))
                    .toString('utf-8')
                    .split('|')
                    .map((val, i) => {
                        if (keys[i] === 'animeBlocks') {
                            const blocks = val.split("'")
                                .map(block => {
                                    const keys = Object.keys(ANIME_BLOCK) as Array<keyof AnimeBlock>;
                                    return block.split(',').reduce((obj: any, val, i) => {
                                        obj[keys[i]] = ANIME_BLOCK[keys[i]](val ?? 0);
                                        return obj;
                                    }, {}) as AnimeBlock;
                                });
                            return [keys[i], blocks];
                        } else if (keys[i] === 'episodeList') {
                            return [keys[i], val];
                        } else {
                            const Constructor = CHARACTER[keys[i]] as NumberConstructor | StringConstructor;
                            return [keys[i], Constructor(val)];
                        }
                    });
                
                return Object.fromEntries(entries) as Character;
            case ReturnCode.NO_SUCH_CHARACTER:
                return;
            default:
                console.log(data.toString('utf-8'));
                throw new Error('Unexpected result');
        }
    }

    async creator(creatorid: number) {
        if (!this.session) 
            throw new Error('Not authenticated');

        const params = convertParams({
            creatorid: `${creatorid}`,
            s: this.session
        });
        const data = await this.sendCommand(`CREATOR ${params}`);
        const returnCode = data.subarray(6, 9).toString('utf-8');

        switch (returnCode) {
            case ReturnCode.CREATOR:
                const keys = Object.keys(CREATOR) as Array<keyof Creator>;
                const entries = data
                    .subarray(data.indexOf(10) + 1, data.lastIndexOf(10))
                    .toString('utf-8')
                    .split('|')
                    .map((val, i) => [keys[i], CREATOR[keys[i]](val)]);
                    
                return Object.fromEntries(entries) as Creator;
            case ReturnCode.NO_SUCH_CREATOR:
                return;
            default:
                console.log(data.toString('utf-8'));
                throw new Error('Unexpected result');
        }
    }

    async group(gid: number) {
        if (!this.session) 
            throw new Error('Not authenticated');

        const params = convertParams({
            gid: `${gid}`,
            s: this.session
        });
        const data = await this.sendCommand(`GROUP ${params}`);
        const returnCode = data.subarray(6, 9).toString('utf-8');

        switch (returnCode) {
            case ReturnCode.GROUP:
                const keys = Object.keys(GROUP) as Array<keyof Group>;
                const entries = data
                    .subarray(data.indexOf(10) + 1, data.lastIndexOf(10))
                    .toString('utf-8')
                    .split('|')
                    .map((val, i) => {
                        if (keys[i] === 'groupRelations') {
                            const blocks = val.split("'")
                                .map(block => {
                                    const keys = Object.keys(GROUP_RELATION) as Array<keyof GroupRelation>;
                                    return block.split(',').reduce((obj: any, val, i) => {
                                        obj[keys[i]] = GROUP_RELATION[keys[i]](val ?? 0);
                                        return obj;
                                    }, {}) as GroupRelation;
                                });
                            return [keys[i], blocks];
                        } else {
                            const Constructor = GROUP[keys[i]] as NumberConstructor | StringConstructor;
                            return [keys[i], Constructor(val)];
                        }
                    });
                        
                return Object.fromEntries(entries) as Group;
            case ReturnCode.NO_SUCH_GROUP:
                return;
            default:
                console.log(data.toString('utf-8'));
                throw new Error('Unexpected result');
        }
    }
}