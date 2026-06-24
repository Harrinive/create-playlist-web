export type InterviewOption = {
    id: string;
    label: string;
    /** English line shown below Chinese in zh-mode interview options. */
    labelEn?: string;
};

export type InterviewAnswers = {
    m1: InterviewOption;
    m2: InterviewOption;
    m3: InterviewOption;
    m5: InterviewOption;
    m4: InterviewOption[];
};

export const SESSION_KEY = 'create-playlist-answers';
