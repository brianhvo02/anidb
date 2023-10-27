export const GROUP_STATUS = {
    gid:               Number,
    groupName:         String,
    completionState:   Number,
    lastEpisodeNumber: Number,
    rating:            Number,
    voteCount:         Number,
    episodeRange:      String
} as const;

export type GroupStatus = {
    [Property in keyof typeof GROUP_STATUS]: ReturnType<typeof GROUP_STATUS[Property]>
}
