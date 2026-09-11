import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressRing } from '@/components/ui-kit'
import { TrustBadge, TrustScoreBar } from '@/components/TrustBadge'
import { cn } from '@/lib/utils'
import {
  CheckCircle2, Circle, Shield, Target, Activity, ClipboardCheck,
  Eye, Lock, Download, ChevronRight, UserCheck,
} from 'lucide-react'
import { Link } from 'react-router'

interface ProfileSidebarProps {
  profileCompletion: number
  resumeFile?: { name: string; size: string; date: string; url?: string }
  hasExperience: boolean
  hasEducation: boolean
  headline: string
}

function ProfileStrengthCard({ profileCompletion, resumeFile, hasExperience, hasEducation, headline }: ProfileSidebarProps) {
  const checklist = [
    { label: 'Add photo', done: true },
    { label: 'Add bio', done: !!headline },
    { label: 'Add experience', done: hasExperience },
    { label: 'Add education', done: hasEducation },
    { label: 'Upload resume', done: !!resumeFile },
    { label: 'Verify identity', done: false },
  ]

  return (
    <Card className="w-full overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <ProgressRing value={profileCompletion} size={72} />
          <div className="min-w-0">
            <div className="text-sm font-semibold">Profile Strength</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {profileCompletion >= 80
                ? 'Your profile looks great!'
                : 'Add more details to strengthen your profile.'}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {checklist.map((item) => (
            <div key={item.label} className="flex items-center gap-2.5">
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
              )}
              <span className={cn('text-sm', item.done ? 'text-foreground' : 'text-muted-foreground')}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {profileCompletion < 80 ? (
          <Button variant="link" size="sm" className="mt-4 h-auto p-0 text-xs text-primary">
            Complete Profile <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        ) : (
          <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-emerald-500">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Profile Complete!
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TrustScoreCard() {
  return (
    <Card className="w-full overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight">72</div>
            <div className="text-xs text-muted-foreground">Trust Score</div>
          </div>
          <div className="ml-auto">
            <TrustBadge tier="provisional" score={72} showScore />
          </div>
        </div>

        <TrustScoreBar score={72} className="mt-3" />

        <div className="mt-4 space-y-2.5">
          {[
            { icon: UserCheck, label: 'Identity', value: '85%' },
            { icon: Target, label: 'Profile', value: '70%' },
            { icon: Activity, label: 'Activity', value: '65%' },
            { icon: ClipboardCheck, label: 'Screening', value: '60%' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </div>
              <span className="font-medium tabular-nums">{value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function QuickLinksCard() {
  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Quick Links</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {[
          { icon: Eye, label: 'View Public Profile', href: '/job-seeker/public' },
          { icon: Lock, label: 'Privacy Settings', href: '/job-seeker/settings' },
          { icon: Download, label: 'Download Data (GDPR)', href: '/job-seeker/settings/data' },
        ].map(({ icon: Icon, label, href }) => (
          <Link
            key={label}
            to={href}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
            <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-50" />
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

export function ProfileSidebar(props: ProfileSidebarProps) {
  return (
    <div className="flex flex-col gap-6 lg:sticky lg:top-6">
      <ProfileStrengthCard {...props} />
      <TrustScoreCard />
      <QuickLinksCard />
    </div>
  )
}
