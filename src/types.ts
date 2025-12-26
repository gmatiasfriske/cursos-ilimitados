export interface Question {
    id: string;
    question: string;
    options: string[];
    correctOptionIndex: number;
}

export interface Activity {
    questions: Question[];
}

export interface Lesson {
    id: string;
    title: string;
    videoUrl?: string;
    activity?: Activity;
    description?: string;
}

export interface Module {
    id: string;
    title: string;
    lessons: Lesson[];
}

export interface Course {
    id: string;
    title: string;
    imageUrl: string;
    isVip?: boolean;
    modules: Module[];
}
