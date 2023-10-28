export const ANIME_DESCRIPTION = {
    currentPart: Number,
    maxParts:    Number,
    description: String
} as const;

export type AnimeDescription = {
    [Property in keyof typeof ANIME_DESCRIPTION]: ReturnType<typeof ANIME_DESCRIPTION[Property]>
}
