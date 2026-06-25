export type InterviewOption = {
    id: string;
    label: string;
};

export type InterviewAnswers = {
    m1: InterviewOption;
    m2: InterviewOption;
    m3: InterviewOption;
    m5?: InterviewOption;
    m_clarify?: InterviewOption;
    m4: InterviewOption[];
};

export type CompactBrief = {
    anchor: string;
    emotion: string;
    pace: string;
    sonic: string;
    flow: string;
    reject: string[];
    seeds: string;
    story?: string;
    reachableGenresNote?: string;
    cooldownText?: string;
};

export type ProposedLine = {
    lineNumber: number;
    artist: string;
    title: string;
    tags: string;
    raw: string;
};

export type VerifyStatus = 'ok' | 'not_found' | 'wrong_match' | 'duplicate' | 'cooldown';

export type VerifiedLine = {
    lineNumber: number;
    proposed: string;
    artist: string;
    title: string;
    tags: string;
    spotifyId: string | null;
    verifiedTitle: string | null;
    verifiedArtist: string | null;
    uri: string | null;
    status: VerifyStatus;
};

export type PublishTrack = {
    lineNumber: number;
    id: string;
    artist: string;
    title: string;
    uri: string;
};

export type SkippedLine = {
    proposed: string;
    reason: string;
};
