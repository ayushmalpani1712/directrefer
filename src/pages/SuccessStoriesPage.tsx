import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, ArrowRight, Building2, Quote, Star } from 'lucide-react'
import { Logo } from '@/components/layout'
import { SocialShareButtons } from '@/components/SocialShareButtons'

interface SuccessStory {
  slug: string
  name: string
  role: string
  company: string
  referrerName: string
  referrerRole: string
  quote: string
  body: string[]
  tags: string[]
}

const STORIES: SuccessStory[] = [
  {
    slug: 'priya-software-engineer-google',
    name: 'Priya Sharma',
    role: 'Software Engineer',
    company: 'Google India',
    referrerName: 'Arjun Mehta',
    referrerRole: 'Senior Software Engineer',
    quote: 'I applied to Google three times through their careers page and never heard back. My referrer submitted my profile internally and I had an interview within two weeks.',
    body: [
      'Priya was a 2022 CS graduate from IIT Bombay with strong DSA skills but no interview calls from top companies.',
      'After creating a profile on DirectRefer, she found Arjun, a senior engineer at Google India, who was open to referrals.',
      'Arjun reviewed her profile, liked her open-source contributions, and submitted a referral for the L3 Software Engineer role.',
      'Two weeks later, Priya had her first interview. She went through four rounds and received an offer within a month.',
      'Key lesson: A complete profile with visible projects and skills makes referrers confident in referring you.',
    ],
    tags: ['Freshers', 'Google', 'Software Engineer'],
  },
  {
    slug: 'rahul-product-manager-flipkart',
    name: 'Rahul Verma',
    role: 'Product Manager',
    company: 'Flipkart',
    referrerName: 'Sneha Kapoor',
    referrerRole: 'Group Product Manager',
    quote: 'As a career switcher from consulting, I thought PM roles at tech companies were out of reach. The referral changed everything.',
    body: [
      'Rahul spent 3 years in management consulting at BCG and wanted to transition to product management at a tech company.',
      'He struggled with resume screenings because his consulting background did not match typical PM job descriptions.',
      'On DirectRefer, he found Sneha, a Group Product Manager at Flipkart who had also switched from consulting.',
      'Sneha understood his transferable skills and advocated for his analytical and strategic thinking abilities.',
      'The referral led to an interview where Rahul\'s consulting experience was actually valued. He received an offer within 6 weeks.',
    ],
    tags: ['Career Switchers', 'Flipkart', 'Product Manager'],
  },
  {
    name: 'Ananya Reddy',
    slug: 'ananya-data-scientist-amazon',
    role: 'Data Scientist',
    company: 'Amazon India',
    referrerName: 'Vikram Singh',
    referrerRole: 'Machine Learning Lead',
    quote: 'Amazon\'s bar is high and the process is rigorous. Having someone internally who knew what the team needed made all the difference.',
    body: [
      'Ananya had 3 years of data science experience at a mid-size startup and wanted to move to a larger company.',
      'She applied to Amazon through their job portal twice but was rejected at the resume screening stage.',
      'Her DirectRefer profile showed her ML projects and Kaggle competitions, which caught Vikram\'s attention.',
      'Vikram submitted a referral for a Data Scientist role on the AWS ML team, specifically highlighting her relevant project work.',
      'The referral got her past the resume screen. After 5 rounds of interviews, she received an offer with a 40% salary increase.',
    ],
    tags: ['Experienced', 'Amazon', 'Data Scientist'],
  },
  {
    slug: 'karan-devops-microsoft',
    name: 'Karan Patel',
    role: 'DevOps Engineer',
    company: 'Microsoft India',
    referrerName: 'Deepa Nair',
    referrerRole: 'Cloud Solutions Architect',
    quote: 'The referral was not just about getting an interview. Deepa also told me what the team actually needed, which helped me prepare better.',
    body: [
      'Karan had 5 years of DevOps experience but felt stuck in his current role at an IT services company.',
      'He wanted to move to a product company but did not know how to position his services background.',
      'Deepa, a Cloud Solutions Architect at Microsoft, reviewed his profile and suggested he highlight his Azure certifications and Kubernetes experience.',
      'She referred him for a Senior DevOps role and shared context about the team\'s current challenges.',
      'Karan tailored his interview preparation around those specific challenges and received an offer within a month.',
    ],
    tags: ['Experienced', 'Microsoft', 'DevOps Engineer'],
  },
]

export default function SuccessStoriesPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    document.title = slug
      ? `${STORIES.find(s => s.slug === slug)?.name || 'Story'} — DirectRefer`
      : 'Success Stories — DirectRefer'
  }, [slug])

  if (slug) {
    const story = STORIES.find(s => s.slug === slug)
    if (!story) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold tracking-tight">Story not found</h1>
            <Link to="/success-stories" className="mt-4 inline-block text-primary hover:underline">Browse all stories</Link>
          </div>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
            <Link to="/" className="flex items-center gap-2"><Logo /></Link>
            <Link to="/success-stories" className="text-sm text-muted-foreground hover:text-foreground">All stories</Link>
          </div>
        </header>
        <article className="mx-auto max-w-3xl px-4 py-12">
          <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/success-stories')} className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to stories
          </button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" /> {story.company}
          </div>
          <h1 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{story.name} — {story.role}</h1>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
            </div>
            <span className="text-sm text-muted-foreground">Referred by {story.referrerName}, {story.referrerRole}</span>
          </div>
          <blockquote className="mt-6 border-l-4 border-primary pl-4 italic text-lg text-muted-foreground">
            <Quote className="mb-2 h-5 w-5 text-primary/40" />{story.quote}
          </blockquote>
          <div className="mt-8 space-y-4">
            {story.body.map((para, i) => (
              <p key={i} className="text-foreground leading-relaxed">{para}</p>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {story.tags.map(t => (
              <span key={t} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{t}</span>
            ))}
          </div>
          <div className="mt-8">
            <SocialShareButtons title={`${story.name} got referred to ${story.company} as ${story.role} via DirectRefer`} url={`https://www.directrefer.in/success-stories/${story.slug}`} />
          </div>
          <div className="mt-12 rounded-xl border border-border/50 bg-muted/30 p-6 text-center">
            <h3 className="font-semibold">Want to share your story?</h3>
            <p className="mt-1 text-sm text-muted-foreground">Get referred and share your experience to help others.</p>
            <Link to="/login" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Get started <ArrowRight className="h-4 w-4" />
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
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">Success Stories</h1>
        <p className="mt-4 text-lg text-muted-foreground">Real people who got hired through employee referrals on DirectRefer.</p>
      </section>
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="grid gap-6 sm:grid-cols-2 items-stretch">
          {STORIES.map(story => (
            <Link key={story.slug} to={`/success-stories/${story.slug}`} className="group flex flex-col rounded-xl border border-border/50 bg-card p-6 shadow-soft hover:shadow-md transition-shadow h-full">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" /> {story.company}
              </div>
              <h3 className="mt-2 text-lg font-semibold group-hover:text-primary transition-colors">{story.name}</h3>
              <p className="text-sm text-muted-foreground">{story.role}</p>
              <blockquote className="mt-3 text-sm italic text-muted-foreground line-clamp-3">
                "{story.quote}"
              </blockquote>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {story.tags.map(t => (
                  <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{t}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
