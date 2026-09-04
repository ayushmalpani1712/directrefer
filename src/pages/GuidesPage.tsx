import { useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router'
import { ArrowLeft, ArrowRight, BookOpen, Clock, Users } from 'lucide-react'
import { Logo } from '@/components/layout'

interface Guide {
  slug: string
  title: string
  description: string
  readTime: string
  category: string
  content: string[]
}

const GUIDES: Guide[] = [
  {
    slug: 'how-to-get-a-referral',
    title: 'How to Get an Employee Referral at Top Tech Companies',
    description: 'A step-by-step guide to requesting and receiving employee referrals that actually lead to interviews.',
    readTime: '5 min read',
    category: 'Getting Started',
    content: [
      'Employee referrals are the most effective way to land a job at top tech companies. Studies show that referred candidates are 4-5x more likely to be hired than those who apply through job boards.',
      'Step 1: Complete your profile. Make sure your skills, experience, and target roles are up to date. Referrers want to see a complete profile before deciding to refer you.',
      'Step 2: Find the right referrer. Look for someone who works at your target company and role. The more relevant their position, the stronger the referral.',
      'Step 3: Personalize your request. Mention why you want to work at that company, what skills you bring, and how you found them. Generic requests get ignored.',
      'Step 4: Follow up respectfully. If you do not hear back in 5-7 days, send a polite follow-up. Referrers are busy professionals — be patient.',
      'Step 5: Prepare for the interview. Once referred, you will likely get an interview faster. Use the time to prepare thoroughly.',
    ],
  },
  {
    slug: 'referral-request-best-practices',
    title: 'Referral Request Best Practices: What Referrers Actually Want to See',
    description: 'Learn what makes a referral request stand out from the hundreds of cold messages referrers receive every month.',
    readTime: '4 min read',
    category: 'Best Practices',
    content: [
      'Referrers receive dozens of requests every month. Here is what makes one stand out.',
      'Be specific about the role. Do not just say "I want a job at Google." Say "I am interested in the L4 Software Engineer role on the Cloud team."',
      'Show you have done your research. Mention a specific project, blog post, or product the team has worked on. This shows genuine interest.',
      'Keep it short. Referrers are busy. Your request should be 3-4 sentences max. Respect their time.',
      'Attach your resume. Make it easy for them to assess your fit. PDF format, one page, clear formatting.',
      'Do not follow up more than once. If you do not hear back after one follow-up, move on. There are other referrers.',
    ],
  },
  {
    slug: 'employee-referral-vs-job-boards',
    title: 'Employee Referral vs Job Boards: Which Actually Gets You Hired?',
    description: 'Data-driven comparison of employee referrals vs online job applications. Spoiler: referrals win by a wide margin.',
    readTime: '6 min read',
    category: 'Research',
    content: [
      'The numbers are clear: employee referrals outperform job boards at every stage of the hiring funnel.',
      'Application to interview rate: Referrals convert at 40-60%, while job boards convert at 2-5%. That is a 10-20x difference.',
      'Time to hire: Referred candidates get hired 55% faster than those who apply through job boards. The average is 29 days vs 45 days.',
      'Retention: Referred employees stay 25% longer than hires from job boards. Companies love this because turnover is expensive.',
      'Salary: Referred candidates often negotiate from a position of strength. The internal advocate provides context about what the team values.',
      'The bottom line: If you are applying only through job boards, you are competing against hundreds of applicants with no advocate. A referral puts you at the front of the line.',
    ],
  },
  {
    slug: 'how-to-be-a-good-referrer',
    title: 'How to Be a Good Referrer: A Guide for Professionals',
    description: 'If you are a verified professional on DirectRefer, here is how to give referrals that actually help people.',
    readTime: '4 min read',
    category: 'For Referrers',
    content: [
      'Being a referrer is one of the most impactful things you can do for your community. Here is how to do it well.',
      'Set realistic expectations. Tell the candidate what the process looks like at your company. How long does the review take? What happens after the referral?',
      'Be honest about fit. If the candidate is not a good fit for the role, say so politely. A rejected referral is better than a wasted interview.',
      'Follow up internally. Submit the referral through your company internal system and check on its status. Do not just submit and forget.',
      'Communicate with the candidate. Let them know when you have submitted, when you hear back, and what the next steps are. Even a "no update yet" message helps.',
      'Set a referral capacity. Only accept as many referrals as you can handle well. Quality over quantity.',
    ],
  },
  {
    slug: 'tech-job-referral-guide-2024',
    title: 'Tech Job Referral Guide 2024: Companies, Roles, and What Works',
    description: 'Which companies are hiring through referrals in 2024? What roles are most referral-friendly? Data from DirectRefer.',
    readTime: '7 min read',
    category: 'Research',
    content: [
      'The tech job market in 2024 is competitive. Here is what referral data tells us about where to focus.',
      'Most referral-friendly companies: Startups and mid-size companies (50-500 employees) have the highest referral acceptance rates. They need talent and trust employee judgment.',
      'In-demand roles: Backend engineers, data engineers, and product managers are the most requested referral roles. Frontend is competitive but still viable.',
      'Geography matters: Bangalore and Hyderabad account for 60% of all referral requests. Delhi NCR and Pune are growing fast.',
      'Skills that get referred: Python, TypeScript, React, AWS, and system design are the top skills mentioned in successful referral requests.',
      'Timing: The best time to request a referral is Monday-Wednesday mornings. Referrers are most responsive early in the week.',
    ],
  },
  {
    slug: 'referral-request-email-templates',
    title: '5 Referral Request Templates That Actually Get Responses',
    description: 'Copy-paste templates for LinkedIn messages, emails, and DirectRefer requests that referrers actually respond to.',
    readTime: '3 min read',
    category: 'Templates',
    content: [
      'Template 1: The Cold Outreach. "Hi [Name], I am [Your Name], a [Role] with [X] years of experience. I saw you work at [Company] and I am interested in the [Role] position. Would you be open to referring me? I have attached my resume for reference."',
      'Template 2: The Mutual Connection. "Hi [Name], [Mutual Contact] suggested I reach out. I am a [Role] looking to join [Company]. Your team\'s work on [Project] is exactly what I want to do. Could I get a referral?"',
      'Template 3: The Event Follow-up. "Hi [Name], we met at [Event] last week. I enjoyed our conversation about [Topic]. I am currently looking for [Role] opportunities at [Company]. Would you be able to refer me?"',
      'Template 4: The Alumni Connection. "Hi [Name], fellow [University] alum here! I noticed you are a [Role] at [Company]. I am interested in the [Role] position and would love your referral. Go [Mascot]!"',
      'Template 5: The DirectRefer Request. Use the platform\'s built-in request feature. It is designed to be concise and professional. Just fill in your target role and add a personal note.',
    ],
  },
]

const CATEGORIES = [...new Set(GUIDES.map(g => g.category))]

export default function GuidesPage() {
  const { topic } = useParams<{ topic: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    document.title = topic
      ? `${GUIDES.find(g => g.slug === topic)?.title || 'Guide'} — DirectRefer`
      : 'Career & Referral Guides — DirectRefer'
  }, [topic])

  if (topic) {
    const guide = GUIDES.find(g => g.slug === topic)
    if (!guide) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold tracking-tight">Guide not found</h1>
            <Link to="/guides" className="mt-4 inline-block text-primary hover:underline">Browse all guides</Link>
          </div>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
            <Link to="/" className="flex items-center gap-2"><Logo /></Link>
            <Link to="/guides" className="text-sm text-muted-foreground hover:text-foreground">All guides</Link>
          </div>
        </header>
        <article className="mx-auto max-w-3xl px-4 py-12">
          <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/guides')} className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to guides
          </button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" /> {guide.category} &middot; {guide.readTime}
          </div>
          <h1 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{guide.title}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{guide.description}</p>
          <div className="mt-8 space-y-4">
            {guide.content.map((para, i) => (
              <p key={i} className="text-foreground leading-relaxed">{para}</p>
            ))}
          </div>
          <div className="mt-12 rounded-xl border border-border/50 bg-muted/30 p-6 text-center">
            <h3 className="font-semibold">Ready to put this into practice?</h3>
            <p className="mt-1 text-sm text-muted-foreground">Find verified professionals who can refer you.</p>
            <Link to="/referral-jobs" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Browse referral jobs <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </article>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2"><Logo /></Link>
          <Link to="/login" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Sign up</Link>
        </div>
      </header>
      <section className="px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">Career & Referral Guides</h1>
        <p className="mt-4 text-lg text-muted-foreground">Practical advice on employee referrals, job hunting, and career growth.</p>
      </section>
      <section className="mx-auto max-w-5xl px-4 pb-16">
        {CATEGORIES.map(cat => (
          <div key={cat} className="mb-10">
            <h2 className="mb-4 font-display text-2xl font-bold tracking-tight">{cat}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
              {GUIDES.filter(g => g.category === cat).map(guide => (
                <Link key={guide.slug} to={`/guides/${guide.slug}`} className="group flex flex-col rounded-xl border border-border/50 bg-card p-5 shadow-soft hover:shadow-md transition-shadow h-full">
                  <h3 className="font-semibold group-hover:text-primary transition-colors">{guide.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{guide.description}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {guide.readTime}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {guide.category}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
