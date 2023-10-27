export const CREATOR = {
    creatorId:       Number,
    kanjiName:       String,
    englishName:     String,
    type:            Number,
    picName:         String,
    urlEnglish:      String,
    urlJapanese:     String,
    wikiUrlEnglish:  String,
    wikiUrlJapanese: String,
    lastUpdateDate:  Number
} as const;

export type Creator = {
    [Property in keyof typeof CREATOR]: ReturnType<typeof CREATOR[Property]>
}
