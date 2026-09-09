export interface ScreeningTemplateCriteria {
  criterion_type: string
  criterion_key: string
  criterion_value: Record<string, unknown>
  weight: number
  name: string
  category: string
}

export interface ScreeningTemplate {
  id: string
  name: string
  description: string
  criteria: ScreeningTemplateCriteria[]
}

export const screeningTemplates: ScreeningTemplate[] = [
  {
    id: 'standard-sde',
    name: 'Standard SDE Screening',
    description: 'Comprehensive screening for software development roles covering experience, skills, and resume quality.',
    criteria: [
      {
        criterion_type: 'experience',
        criterion_key: 'min_years',
        criterion_value: { min: 2 },
        weight: 30,
        name: 'Minimum Experience',
        category: 'experience',
      },
      {
        criterion_type: 'skills',
        criterion_key: 'required_skills',
        criterion_value: { skills: ['JavaScript', 'TypeScript', 'React'] },
        weight: 40,
        name: 'Technical Skills',
        category: 'skills',
      },
      {
        criterion_type: 'resume',
        criterion_key: 'resume_check',
        criterion_value: { required: true },
        weight: 30,
        name: 'Resume Review',
        category: 'resume',
      },
    ],
  },
  {
    id: 'management-track',
    name: 'Management Track',
    description: 'Screening for leadership and management positions focusing on leadership experience, education, and background.',
    criteria: [
      {
        criterion_type: 'experience',
        criterion_key: 'leadership_years',
        criterion_value: { min: 3 },
        weight: 35,
        name: 'Leadership Experience',
        category: 'experience',
      },
      {
        criterion_type: 'education',
        criterion_key: 'degree_level',
        criterion_value: { min_degree: 'bachelors' },
        weight: 25,
        name: 'Education Level',
        category: 'background',
      },
      {
        criterion_type: 'experience',
        criterion_key: 'management_experience',
        criterion_value: { required: true },
        weight: 40,
        name: 'Management Background',
        category: 'experience',
      },
    ],
  },
  {
    id: 'quick-screen',
    name: 'Quick Screen',
    description: 'Fast screening based on skills match only. Ideal for high-volume hiring.',
    criteria: [
      {
        criterion_type: 'skills',
        criterion_key: 'skills_match',
        criterion_value: { match_type: 'any', min_match: 1 },
        weight: 100,
        name: 'Skills Match',
        category: 'skills',
      },
    ],
  },
]
