export const CHARACTER = {
    charId:         Number,
    kanjiName:      String,
    englishName:    String,
    picName:        String,
    animeBlocks:    Array<AnimeBlock>,
    episodeList:    String,
    // episodeList:    Array<Number>,
    lastUpdateDate: Number,
    type:           Number,
    gender:         String
} as const;

export const ANIME_BLOCK = {
    aid:          Number,
    appearance:   Number,
    creatorId:    Number,
    isMainSeiyuu: Boolean
} as const;

export type Character = {
    [Property in keyof typeof CHARACTER]: ReturnType<typeof CHARACTER[Property]>
}

export type AnimeBlock = {
    [Property in keyof typeof ANIME_BLOCK]: ReturnType<typeof ANIME_BLOCK[Property]>
}
