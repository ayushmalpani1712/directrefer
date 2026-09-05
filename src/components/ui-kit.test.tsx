import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard, CompanyChip, GAvatar, Stars, EmptyState, SectionHeader } from '@/components/ui-kit'
import { Inbox } from 'lucide-react'

vi.mock('react-router', () => ({
  Link: ({ to, className, children }: { to: string; className?: string; children: React.ReactNode }) => (
    <a href={to} className={className} data-testid="mock-link">
      {children}
    </a>
  ),
}))

describe('StatCard', () => {
  it('renders value and label', () => {
    render(<StatCard icon={Inbox} label="Total" value={42} />)
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
  })

  it('renders delta badge when provided', () => {
    render(<StatCard icon={Inbox} label="Total" value={10} delta={12} />)
    expect(screen.getByText('12%')).toBeInTheDocument()
  })

  it('renders negative delta with correct styling', () => {
    render(<StatCard icon={Inbox} label="Total" value={10} delta={-5} />)
    expect(screen.getByText('5%')).toBeInTheDocument()
  })

  it('renders deltaLabel when provided', () => {
    render(<StatCard icon={Inbox} label="Total" value={10} deltaLabel="last month" />)
    expect(screen.getByText(/last month/)).toBeInTheDocument()
  })

  it('wraps in Link when href is provided', () => {
    render(<StatCard icon={Inbox} label="Total" value={10} href="/dashboard" />)
    const link = screen.getByTestId('mock-link')
    expect(link).toHaveAttribute('href', '/dashboard')
  })

  it('does not wrap in Link when href is omitted', () => {
    render(<StatCard icon={Inbox} label="Total" value={10} />)
    expect(screen.queryByTestId('mock-link')).not.toBeInTheDocument()
  })
})

describe('CompanyChip', () => {
  it('renders single initial from a single word', () => {
    render(<CompanyChip name="Google" />)
    expect(screen.getByText('G')).toBeInTheDocument()
  })

  it('renders initials from multi-word name', () => {
    render(<CompanyChip name="Meta AI" />)
    expect(screen.getByText('MA')).toBeInTheDocument()
  })

  it('strips non-alpha characters before extracting initials', () => {
    render(<CompanyChip name="123Test Co." />)
    expect(screen.getByText('TC')).toBeInTheDocument()
  })
})

describe('GAvatar', () => {
  it('renders initials for a given name', () => {
    render(<GAvatar name="John Doe" color="#8378EE" />)
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('applies the background color', () => {
    render(<GAvatar name="Jane Smith" color="#34D399" />)
    const el = screen.getByText('JS')
    expect(el.closest('div')).toHaveStyle({ backgroundColor: '#34D399' })
  })

  it('applies ring class when ring prop is true', () => {
    render(<GAvatar name="A B" color="#F45485" ring />)
    const el = screen.getByText('AB')
    expect(el.className).toContain('ring-2')
  })

  it('applies custom className', () => {
    render(<GAvatar name="X Y" color="#38BDF8" className="h-16 w-16" />)
    const el = screen.getByText('XY')
    expect(el.className).toContain('h-16')
  })

  it('auto-assigns color from userId', () => {
    render(<GAvatar name="Test User" userId="abc-123" />)
    const el = screen.getByText('TU')
    const bg = el.closest('div')?.getAttribute('style')
    expect(bg).toContain('background-color')
  })
})

describe('Stars', () => {
  it('renders 5 star elements', () => {
    const { container } = render(<Stars value={3} />)
    const stars = container.querySelectorAll('svg')
    expect(stars.length).toBe(5)
  })

  it('fills stars up to the rounded value', () => {
    const { container } = render(<Stars value={4} />)
    const filled = container.querySelectorAll('.fill-amber-400')
    expect(filled.length).toBe(4)
  })

  it('renders unfilled stars for the remainder', () => {
    const { container } = render(<Stars value={2} />)
    const unfilled = container.querySelectorAll('.fill-muted')
    expect(unfilled.length).toBe(3)
  })
})

describe('EmptyState', () => {
  it('renders icon, title, and description', () => {
    render(<EmptyState icon={Inbox} title="No data" description="Nothing to show yet" />)
    expect(screen.getByText('No data')).toBeInTheDocument()
    expect(screen.getByText('Nothing to show yet')).toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    render(
      <EmptyState
        icon={Inbox}
        title="Empty"
        description="No items"
        action={<button>Create one</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'Create one' })).toBeInTheDocument()
  })

  it('does not render action area when action is omitted', () => {
    const { container } = render(<EmptyState icon={Inbox} title="Empty" description="No items" />)
    expect(container.querySelector('.mt-4 button')).not.toBeInTheDocument()
  })
})

describe('SectionHeader', () => {
  it('renders title', () => {
    render(<SectionHeader title="My Section" />)
    expect(screen.getByText('My Section')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<SectionHeader title="Section" subtitle="A subtitle" />)
    expect(screen.getByText('A subtitle')).toBeInTheDocument()
  })

  it('renders action element when provided', () => {
    render(<SectionHeader title="S" action={<button>Add</button>} />)
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('does not render subtitle when omitted', () => {
    render(<SectionHeader title="Only Title" />)
    expect(screen.queryByText(/subtitle/i)).not.toBeInTheDocument()
  })
})
