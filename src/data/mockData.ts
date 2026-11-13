import { JobPosting, UserProfile, SkillAssessmentQuestion, SystemAuditLog, CompanyProfile } from '../types';

export const INITIAL_COMPANIES: CompanyProfile[] = [];

export const INITIAL_JOBS: JobPosting[] = [];

export const INITIAL_USERS: UserProfile[] = [];

export const INITIAL_AUDIT_LOGS: SystemAuditLog[] = [];

export const SKILL_QUIZ_QUESTIONS: Record<string, SkillAssessmentQuestion[]> = {
  'TypeScript': [
    {
      id: 'q-ts-1',
      skillName: 'TypeScript',
      difficulty: 'Intermediate',
      question: 'In TypeScript, what is the primary difference between `type` alias and `interface` regarding declaration merging?',
      options: [
        'Interfaces support declaration merging (multiple declarations merge automatically), whereas type aliases do not.',
        'Type aliases support declaration merging, while interfaces throw compile errors.',
        'Neither supports declaration merging in modern TypeScript.',
        'Interfaces only work with primitive types, while type aliases only work with objects.'
      ],
      correctIndex: 0,
      explanation: 'Interfaces in TypeScript can be declared multiple times in the same scope and their members will merge, whereas type aliases cannot be reopened.'
    },
    {
      id: 'q-ts-2',
      skillName: 'TypeScript',
      difficulty: 'Advanced',
      question: 'Which TypeScript utility type constructs a type with all properties of Type set to optional?',
      options: ['Required<T>', 'Partial<T>', 'Readonly<T>', 'Record<K, T>'],
      correctIndex: 1,
      explanation: '`Partial<T>` makes all properties in type T optional by adding `?` modifiers to each property.'
    }
  ],
  'React': [
    {
      id: 'q-react-1',
      skillName: 'React',
      difficulty: 'Intermediate',
      question: 'Why should you avoid updating state directly in the body of a React functional component?',
      options: [
        'It causes infinite re-render loops because state changes trigger component re-execution.',
        'React will automatically convert your function component into a class.',
        'React throws a compile-time syntax error on any state assignment.',
        'It deletes local storage values.'
      ],
      correctIndex: 0,
      explanation: 'Calling state updater functions unconditionally in the render path immediately triggers another render, causing an infinite loop.'
    },
    {
      id: 'q-react-2',
      skillName: 'React',
      difficulty: 'Advanced',
      question: 'What is the purpose of `useCallback` in React?',
      options: [
        'To cache the return value of an expensive mathematical computation.',
        'To memoize a callback function instance between renders to prevent unnecessary child re-renders.',
        'To execute side-effects after the DOM has been painted.',
        'To create mutable ref objects across renders.'
      ],
      correctIndex: 1,
      explanation: '`useCallback` caches a function definition between renders when passed to optimized child components relying on reference equality.'
    }
  ],
  'Python': [
    {
      id: 'q-py-1',
      skillName: 'Python',
      difficulty: 'Intermediate',
      question: 'What is the time complexity of looking up a key in a standard Python dictionary (`dict`) on average?',
      options: ['O(n)', 'O(1)', 'O(log n)', 'O(n^2)'],
      correctIndex: 1,
      explanation: 'Python dictionaries are implemented as hash tables, providing average O(1) constant time lookups.'
    },
    {
      id: 'q-py-2',
      skillName: 'Python',
      difficulty: 'Intermediate',
      question: 'In Pandas, which method is best suited to handle missing values by filling them with a specific number or string?',
      options: ['df.dropna()', 'df.fillna(value)', 'df.replace_null()', 'df.impute()'],
      correctIndex: 1,
      explanation: '`df.fillna()` replaces null/NaN values with a designated scalar, series, or method (like forward fill).'
    }
  ],
  'SQL': [
    {
      id: 'q-sql-1',
      skillName: 'SQL',
      difficulty: 'Intermediate',
      question: 'What is the difference between `WHERE` and `HAVING` clauses in SQL?',
      options: [
        '`WHERE` filters rows before aggregations; `HAVING` filters aggregated group results after `GROUP BY`.',
        '`HAVING` filters individual rows, while `WHERE` is only used for joins.',
        '`WHERE` and `HAVING` are 100% interchangeable in all SQL dialects.',
        '`HAVING` is faster than `WHERE` in all query plans.'
      ],
      correctIndex: 0,
      explanation: '`WHERE` operates on row-level attributes before grouping, whereas `HAVING` filters grouped subsets produced by aggregate functions.'
    }
  ],
  'AWS': [
    {
      id: 'q-aws-1',
      skillName: 'AWS',
      difficulty: 'Intermediate',
      question: 'In AWS architecture, which service provides serverless compute that executes code in response to events?',
      options: ['Amazon EC2', 'Amazon Lambda', 'Amazon ECS', 'Amazon RDS'],
      correctIndex: 1,
      explanation: 'AWS Lambda is an event-driven, serverless computing platform that executes code in response to HTTP requests, S3 events, or queue messages.'
    }
  ],
  'Cybersecurity': [
    {
      id: 'q-sec-1',
      skillName: 'Cybersecurity',
      difficulty: 'Intermediate',
      question: 'Under South Africa’s POPIA legislation, what constitutes "Personal Information"?',
      options: [
        'Only credit card numbers and passwords.',
        'Any information relating to an identifiable, living natural person (and juristic person), including race, gender, ID number, and email.',
        'Only data that has been copyrighted in South Africa.',
        'Public government gazettes.'
      ],
      correctIndex: 1,
      explanation: 'Section 1 of POPIA broadly defines Personal Information as information relating to an identifiable living person or juristic person.'
    }
  ]
};

export const SA_LEARNING_PROVIDERS = [
  {
    name: 'University of Cape Town (UCT) Online Short Courses',
    type: 'Academic / NQF Accredited',
    focus: 'Data Analysis, Fintech, Project Management, Digital Law',
    recognizedBy: 'South African Qualifications Authority (SAQA)',
    typicalDuration: '8 - 12 Weeks'
  },
  {
    name: 'Wits PLUS (Centre for Part-Time Studies)',
    type: 'Higher Education Certification',
    focus: 'Software Engineering, Cloud Computing, Business Analysis',
    recognizedBy: 'Council on Higher Education (CHE)',
    typicalDuration: '6 - 12 Months'
  },
  {
    name: 'WeThinkCode_',
    type: 'Peer-to-Peer Tech Academy',
    focus: 'Full-Stack Software Development, Python, Java, DevOps',
    recognizedBy: 'MICT SETA Level 5 / 6 Accredited',
    typicalDuration: '1 - 2 Years'
  },
  {
    name: 'ExploreAI Academy',
    type: 'Specialist Data Science Accelerator',
    focus: 'AI, Machine Learning, Python Data Science, SQL Analytics',
    recognizedBy: 'Industry Recognized / Corporate Sponsored',
    typicalDuration: '6 - 12 Months'
  },
  {
    name: 'AWS Cloud Academy South Africa (with YES4Youth)',
    type: 'Global Cloud Certification',
    focus: 'AWS Solutions Architecture, SysOps, DevOps, Security',
    recognizedBy: 'Amazon Web Services Global Certifications',
    typicalDuration: '3 - 6 Months'
  }
];
