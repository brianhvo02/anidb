export const FILE_MASK = {
    fid:                    [ 0,   0,        Number,   null ],
    aid:                    [ 0,  64,        Number,   null ],
    eid:                    [ 0,  32,        Number,   null ],
    gid:                    [ 0,  16,        Number,   null ],
    myListId:               [ 0,   8,        Number,   null ],
    otherEpisodes:          [ 0,   4, Array<Number>, Number ],
    isDeprecated:           [ 0,   2,        Number,   null ],
    state:                  [ 0,   1,        Number,   null ],

    size:                   [ 1, 128,        String,   null ],
    ed2k:                   [ 1,  64,        String,   null ],
    md5:                    [ 1,  32,        String,   null ],
    sha1:                   [ 1,  16,        String,   null ],
    crc32:                  [ 1,   8,        String,   null ],
    videoColorDepth:        [ 1,   2,        Number,   null ],

    quality:                [ 2, 128,        String,   null ],
    source:                 [ 2,  64,        String,   null ],
    audioCodecList:         [ 2,  32, Array<String>, String ],
    audioBitrateList:       [ 2,  16, Array<Number>, Number ],
    videoCodec:             [ 2,   8,        String,   null ],
    videoBitrate:           [ 2,   4,        Number,   null ],
    videoResolution:        [ 2,   2,        String,   null ],
    fileType:               [ 2,   1,        String,   null ],

    dubLanguage:            [ 3, 128,        String,   null ],
    subLanguage:            [ 3,  64,        String,   null ],
    lengthInSeconds:        [ 3,  32,        Number,   null ],
    description:            [ 3,  16,        String,   null ],
    airedDate:              [ 3,   8,        Number,   null ],
    fileName:               [ 3,   1,        String,   null ],

    myListState:            [ 4, 128,        Number,   null ],
    myListFileState:        [ 4,  64,        Number,   null ],
    myListViewed:           [ 4,  32,        Number,   null ],
    myListViewDate:         [ 4,  16,        Number,   null ],
    myListStorage:          [ 4,   8,        String,   null ],
    myListSource:           [ 4,   4,        String,   null ],
    myListOther:            [ 4,   2,        String,   null ],
} as const;

export const F_ANIME_MASK = {
    animeTotalEpisodes:     [ 0, 128,        Number,   null ],
    highestEpisodeNumber:   [ 0,  64,        Number,   null ],
    year:                   [ 0,  32,        String,   null ],
    type:                   [ 0,  16,        String,   null ],
    relatedAidList:         [ 0,   8, Array<String>, String ],
    relatedAidType:         [ 0,   4, Array<String>, String ],
    categoryList:           [ 0,   2, Array<String>, String ],

    romajiName:             [ 1, 128,        String,   null ],
    kanjiName:              [ 1,  64,        String,   null ],
    englishName:            [ 1,  32,        String,   null ],
    otherNames:             [ 1,  16, Array<String>, String ],
    shortNames:             [ 1,   8, Array<String>, String ],
    synonyms:               [ 1,   4, Array<String>, String ],

    episodeNumber:          [ 2, 128,        Number,   null ],
    episodeName:            [ 2,  64,        Number,   null ],
    episodeRomajiName:      [ 2,  32,        String,   null ],
    episodeKanjiname:       [ 2,  16,        String,   null ],
    episodeRating:          [ 2,   8,        Number,   null ],
    episodeVoteCount:       [ 2,   4,        Number,   null ],

    groupName:              [ 3, 128,        String,   null ],
    groupShortName:         [ 3,  64,        String,   null ],
    dateAnimeRecordUpdated: [ 3,   1,        Number,   null ],
} as const;

export type File = {
    [Property in keyof typeof FILE_MASK]: ReturnType<typeof FILE_MASK[Property][2]>
}

export type FAnime = {
    [Property in keyof typeof F_ANIME_MASK]: ReturnType<typeof F_ANIME_MASK[Property][2]>
}

export const generateFileMask = <T extends keyof File>(fields: Array<T>) => {
    const mask = Buffer.alloc(5);
    fields.forEach(val => {
        const key = val as keyof File;
        mask[FILE_MASK[key][0]] += FILE_MASK[key][1];
    });

    return mask.toString('hex');
}

export const generateFAnimeMask = <T extends keyof FAnime>(fields: Array<T>) => {
    const mask = Buffer.alloc(4);
    fields.forEach(val => {
        const key = val as keyof FAnime;
        mask[F_ANIME_MASK[key][0]] += F_ANIME_MASK[key][1];
    });

    return mask.toString('hex');
}