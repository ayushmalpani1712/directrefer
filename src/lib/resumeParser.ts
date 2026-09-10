export interface ParsedResume {
  skills: string[]
  experience: { title: string; company: string; duration: string }[]
  education: { school: string; degree: string; year: string }[]
  contact: { email: string; phone: string; linkedin: string }
}

const CANONICAL_SKILLS = [
  'javascript', 'typescript', 'react', 'vue', 'angular', 'svelte',
  'node.js', 'node', 'python', 'java', 'c++', 'c#', 'ruby', 'go', 'rust', 'php',
  'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ci/cd',
  'html', 'css', 'sass', 'tailwind', 'bootstrap',
  'graphql', 'rest', 'api', 'microservices',
  'git', 'github', 'gitlab',
  'agile', 'scrum', 'jira',
  'machine learning', 'ml', 'ai', 'data science', 'tensorflow', 'pytorch',
  'figma', 'sketch', 'photoshop', 'illustrator',
  'excel', 'tableau', 'power bi',
  'salesforce', 'hubspot', 'marketo',
  'kafka', 'rabbitmq', 'grpc',
  'linux', 'bash', 'powershell',
  'security', 'oauth', 'jwt', 'encryption',
  'swift', 'kotlin', 'flutter', 'react native',
  'next.js', 'nextjs', 'express', 'django', 'flask', 'spring',
  'webpack', 'vite', 'babel', 'eslint',
  'storybook', 'cypress', 'jest', 'mocha',
  'leadership', 'communication', 'teamwork', 'problem solving',
]

// ── Regex Patterns ─────────────────────────────────────────────────────────

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g
const LINKEDIN_REGEX = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/gi
const DATE_RANGE_REGEX = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{4}\s*[-–—]\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{4}\s*[-–—]\s*(?:Present|Current|Now)|\d{4}\s*[-–—]\s*\d{4}|\d{4}\s*[-–—]\s*(?:Present|Current|Now)/gi

// ── Main Parser ────────────────────────────────────────────────────────────

export function parseResumeText(text: string): ParsedResume {
  const contact = extractContact(text)
  const experience = extractExperience(text)
  const education = extractEducation(text)
  const skills = extractSkills(text)

  return { skills, experience, education, contact }
}

function extractContact(text: string): ParsedResume['contact'] {
  const emails = text.match(EMAIL_REGEX) ?? []
  const phones = text.match(PHONE_REGEX) ?? []
  const linkedins = text.match(LINKEDIN_REGEX) ?? []

  return {
    email: emails[0] ?? '',
    phone: phones[0]?.trim() ?? '',
    linkedin: linkedins[0] ?? '',
  }
}

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase()
  const found = new Set<string>()

  for (const skill of CANONICAL_SKILLS) {
    if (lower.includes(skill)) {
      found.add(skill)
    }
  }

  return [...found].sort()
}

function extractExperience(text: string): ParsedResume['experience'] {
  const lines = text.split('\n')
  const experience: ParsedResume['experience'] = []

  const jobTitlePatterns = [
    /(?:senior|junior|lead|principal|staff|associate|assistant|chief|head|director|manager|engineer|developer|architect|analyst|specialist|consultant|coordinator|executive|officer)/i,
    /(?:software|frontend|backend|full[\s-]?stack|devops|data|ml|ai|cloud|security|qa|test|mobile|web|systems|network|platform|infrastructure)/i,
  ]

  const companyPatterns = [
    /(?:at|@)\s+([A-Z][A-Za-z\s&]+)/,
    /\b(?:Google|Microsoft|Amazon|Apple|Meta|Netflix|Tesla|Uber|Airbnb|Stripe|Square|PayPal|Salesforce|Oracle|SAP|Adobe|Atlassian|Slack|Zoom|Shopify|Twilio|Snowflake|Databricks|Cloudflare|Vercel|Supabase)\b/,
  ]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const dateMatch = line.match(DATE_RANGE_REGEX)
    if (dateMatch) {
      let title = ''
      let company = ''

      const titleMatch = jobTitlePatterns.some(p => p.test(line))
      if (titleMatch) {
        title = line.replace(DATE_RANGE_REGEX, '').replace(/[-–—]/g, '').trim()
      }

      for (const pattern of companyPatterns) {
        const match = line.match(pattern)
        if (match) {
          company = match[1]?.trim() ?? match[0]
          break
        }
      }

      if (title || company) {
        experience.push({
          title: title || (lines[i + 1]?.trim() ?? ''),
          company,
          duration: dateMatch[0],
        })
      }
    }
  }

  return experience.slice(0, 10)
}

function extractEducation(text: string): ParsedResume['education'] {
  const lines = text.split('\n')
  const education: ParsedResume['education'] = []

  const degreePatterns = /(?:bachelor|master|ph\.?d|mba|b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?|associate|diploma|certificate)/i
  const yearPatterns = /\b(19|20)\d{2}\b/

  const schoolNames = [
    /(?:University|College|Institute|School|Academy)\s+(?:of\s+)?[A-Z][A-Za-z\s]+/,
    /\b(?:MIT|Stanford|Harvard|Carnegie Mellon|Berkeley|Georgia Tech|Caltech|Princeton|Yale|Columbia|Cornell|UCLA|UT Austin|University of [A-Z][a-z]+)\b/,
  ]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const hasDegree = degreePatterns.test(line)
    if (!hasDegree) continue

    const degree = line
    let school = ''
    let year = ''

    for (const pattern of schoolNames) {
      const match = line.match(pattern) ?? (lines[i + 1] ?? '').match(pattern)
      if (match) {
        school = match[0]
        break
      }
    }

    const yearMatch = line.match(yearPatterns)
    if (yearMatch) year = yearMatch[0]

    if (degree) {
      education.push({
        school,
        degree: degree.replace(yearPatterns, '').trim(),
        year,
      })
    }
  }

  return education.slice(0, 5)
}

// ── Skill Suggestion ───────────────────────────────────────────────────────

export interface SkillMatch {
  name: string
  category: string
  confidence: number
}

export async function suggestSkills(parsedData: ParsedResume): Promise<SkillMatch[]> {
  const { supabase } = await import('@/lib/supabase')

  const { data: dbSkills } = await supabase
    .from('skills')
    .select('id, name, category, slug')

  if (!dbSkills || dbSkills.length === 0) {
    return parsedData.skills.map(skill => ({
      name: skill,
      category: 'general',
      confidence: 0.5,
    }))
  }

  const matches: SkillMatch[] = []
  const seen = new Set<string>()

  for (const textSkill of parsedData.skills) {
    const normalized = textSkill.toLowerCase()

    for (const dbSkill of dbSkills) {
      if (seen.has(dbSkill.id)) continue

      const dbName = dbSkill.name.toLowerCase()
      if (normalized === dbName || normalized.includes(dbName) || dbName.includes(normalized)) {
        matches.push({
          name: dbSkill.name,
          category: dbSkill.category,
          confidence: normalized === dbName ? 1.0 : 0.7,
        })
        seen.add(dbSkill.id)
        break
      }
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence)
}
