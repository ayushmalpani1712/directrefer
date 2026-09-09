export interface JobTemplate {
  title: string
  department: string
  description: string
  requirements: string[]
}

export const jobTemplates: JobTemplate[] = [
  {
    title: 'Software Engineer',
    department: 'Engineering',
    description: 'We are looking for a skilled Software Engineer to join our engineering team. You will design, develop, and maintain high-quality software solutions that scale to millions of users. You will collaborate with cross-functional teams to define and implement new features, ensure code quality, and drive technical excellence.',
    requirements: [
      'Bachelor\'s degree in Computer Science or related field',
      '3+ years of experience in software development',
      'Proficiency in modern programming languages (TypeScript, Python, Go, or similar)',
      'Experience with cloud platforms (AWS, GCP, or Azure)',
      'Strong understanding of software design patterns and architecture',
      'Experience with CI/CD pipelines and automated testing',
    ],
  },
  {
    title: 'Product Manager',
    department: 'Product',
    description: 'We are seeking a Product Manager to lead the strategy and execution of key product initiatives. You will work closely with engineering, design, and business stakeholders to define product vision, prioritize features, and deliver impactful solutions that drive user growth and engagement.',
    requirements: [
      'Bachelor\'s degree or equivalent practical experience',
      '4+ years of product management experience',
      'Proven track record of shipping successful products',
      'Strong analytical and data-driven decision-making skills',
      'Excellent communication and stakeholder management abilities',
      'Experience with agile development methodologies',
    ],
  },
  {
    title: 'Data Analyst',
    department: 'Data & Analytics',
    description: 'We are hiring a Data Analyst to turn raw data into actionable insights that drive business decisions. You will build dashboards, run analyses, and partner with teams across the organization to uncover trends, measure performance, and identify opportunities for growth.',
    requirements: [
      'Bachelor\'s degree in Statistics, Mathematics, Economics, or related field',
      '2+ years of experience in data analysis',
      'Proficiency in SQL and data visualization tools (Tableau, Looker, or similar)',
      'Experience with Python or R for data manipulation',
      'Strong problem-solving skills and attention to detail',
      'Ability to communicate complex findings to non-technical audiences',
    ],
  },
  {
    title: 'Marketing Manager',
    department: 'Marketing',
    description: 'We are looking for a Marketing Manager to develop and execute marketing strategies that drive brand awareness, user acquisition, and retention. You will manage campaigns across multiple channels, analyze performance metrics, and collaborate with creative and product teams to tell our story effectively.',
    requirements: [
      'Bachelor\'s degree in Marketing, Business, or related field',
      '4+ years of experience in marketing or growth roles',
      'Experience with digital marketing channels (SEO, SEM, social, email)',
      'Strong analytical skills and experience with marketing analytics tools',
      'Excellent written and verbal communication skills',
      'Proven ability to manage multiple projects and meet deadlines',
    ],
  },
  {
    title: 'UX Designer',
    department: 'Design',
    description: 'We are seeking a UX Designer to craft intuitive and delightful user experiences across our products. You will conduct user research, create wireframes and prototypes, and collaborate closely with product and engineering teams to bring designs from concept to production.',
    requirements: [
      'Bachelor\'s degree in Design, HCI, or related field',
      '3+ years of experience in UX/UI design',
      'Proficiency in design tools (Figma, Sketch, or similar)',
      'Experience conducting user research and usability testing',
      'Strong portfolio demonstrating user-centered design process',
      'Understanding of front-end development principles (HTML, CSS, JS)',
    ],
  },
]
