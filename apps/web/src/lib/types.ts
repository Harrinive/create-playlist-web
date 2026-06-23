export type InterviewOption = {
    id: string;
    label: string;
};

export type InterviewAnswers = {
    m1: InterviewOption;
    m2: InterviewOption;
    m3: InterviewOption;
    m5: InterviewOption;
    m4: InterviewOption[];
};

export const SESSION_KEY = 'create-playlist-answers';
