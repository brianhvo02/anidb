export const GROUP = {
    gid:              Number,
    rating:           Number,
    voteCount:        Number,
    animeCount:       Number,
    fileCount:        Number,
    longName:         String,
    shortName:        String,
    ircChannel:       String,
    ircServer:        String,
    url:              String,
    picName:          String,
    foundedDate:      Number,
    disbandedDate:    Number,
    dateFlags:        Number,
    lastReleaseDate:  Number,
    lastActivityDate: Number,
    groupRelations:   Array<GroupRelation>
} as const;

export const GROUP_RELATION = {
    otherGid:     Number,
    relationType: Number
} as const;

export type Group = {
    [Property in keyof typeof GROUP]: ReturnType<typeof GROUP[Property]>
}

export type GroupRelation = {
    [Property in keyof typeof GROUP_RELATION]: ReturnType<typeof GROUP_RELATION[Property]>
}

