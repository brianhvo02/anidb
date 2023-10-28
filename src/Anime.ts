export const ANIME_MASK = {
    aid:                    [ 0, 128,        Number,   null ],
    dateFlags:              [ 0,  64,        Number,   null ],
    year:                   [ 0,  32,        String,   null ],
    type:                   [ 0,  16,        String,   null ],
    relatedAidList:         [ 0,   8, Array<String>, String ],
    relatedAidType:         [ 0,   4, Array<String>, String ],

    romajiName:             [ 1, 128,        String,   null ],
    kanjiName:              [ 1,  64,        String,   null ],
    englishName:            [ 1,  32,        String,   null ],
    otherNames:             [ 1,  16, Array<String>, String ],
    shortNames:             [ 1,   8, Array<String>, String ],
    synonyms:               [ 1,   4, Array<String>, String ],

    episodes:               [ 2, 128,        Number,   null ],
    highestEpisodeNumber:   [ 2,  64,        Number,   null ],
    specialEpisodeCount:    [ 2,  32,        Number,   null ],
    airDate:                [ 2,  16,        Number,   null ],
    endDate:                [ 2,   8,        Number,   null ],
    url:                    [ 2,   4,        String,   null ],
    picName:                [ 2,   2,        String,   null ],

    rating:                 [ 3, 128,        Number,   null ],
    voteCount:              [ 3,  64,        Number,   null ],
    tempRating:             [ 3,  32,        Number,   null ],
    tempVoteCount:          [ 3,  16,        Number,   null ],
    averageReviewRating:    [ 3,   8,        Number,   null ],
    reviewCount:            [ 3,   4,        Number,   null ],
    awardList:              [ 3,   2, Array<String>, String ],
    isAdultRestricted:      [ 3,   1,       Boolean,   null ],

    annId:                  [ 4,  64,        Number,   null ],
    allCinemaId:            [ 4,  32,        Number,   null ],
    animeNfoId:             [ 4,  16,        Number,   null ],
    tagNameList:            [ 4,   8, Array<String>, String ],
    tagIdList:              [ 4,   4, Array<Number>, Number ],
    tagWeightList:          [ 4,   2, Array<Number>, Number ],
    dateRecordUpdated:      [ 4,   1,        Number,   null ],

    characterIdList:        [ 5, 128, Array<Number>, Number ],

    specialsCount:          [ 6, 128,        Number,   null ],
    creditsCount:           [ 6,  64,        Number,   null ],
    otherCount:             [ 6,  32,        Number,   null ],
    trailerCount:           [ 6,  16,        Number,   null ],
    parodyCount:            [ 6,   8,        Number,   null ],
} as const;

export type Anime = {
    [Property in keyof typeof ANIME_MASK]: ReturnType<typeof ANIME_MASK[Property][2]>
}

export const generateAnimeMask = <T extends keyof Anime>(fields: Array<T>) => {
    const mask = Buffer.alloc(7);
    fields.forEach(val => {
        const key = val as keyof Anime;
        mask[ANIME_MASK[key][0]] += ANIME_MASK[key][1];
    });

    return mask.toString('hex');
}

export type AnimeResult<T extends keyof Anime> = Pick<Anime, T> | undefined;