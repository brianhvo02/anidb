export const EPISODE = {
    eid: Number,
    aid: Number,
    length: Number,
    rating: Number,
    voteCount: Number,
    episodeNumber: String,
    englishName: String,
    romajiName: String,
    kanjiName: String,
    airDate: Number,
    type: Number
} as const;

export type Episode = {
    [Property in keyof typeof EPISODE]: ReturnType<typeof EPISODE[Property]>
}
