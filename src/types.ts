export interface Question {
    id: string;
    question: string;
    options: string[];
    correctOptionIndex: number;
}

export interface Activity {
    questions: Question[];
}

export interface LessonContent {
    id: string;
    type: 'pdf' | 'epub' | 'mp3' | 'link';
    title: string;
    url: string;
}

export interface Lesson {
    id: string;
    title: string;
    videoUrl?: string;
    activity?: Activity;
    contents?: LessonContent[];
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
    examEnabled?: boolean;
    examPool?: Question[];
}
