export interface CompanyData {
  slug: string
  name: string
  logo: string
  industry: string
  headquarters: string
  description: string
  referralTips: string[]
  averageReferralBonus: string
}

export interface RoleData {
  slug: string
  label: string
  description: string
}

export interface LocationData {
  slug: string
  label: string
  country: string
}

export const COMPANIES: CompanyData[] = [
  { slug: 'google', name: 'Google', logo: '🔍', industry: 'Technology', headquarters: 'Mountain View, CA', description: 'Google is a multinational technology company specializing in Internet-related services and products, including search, cloud computing, software, and hardware.', referralTips: ['Tailor your resume to the specific team you are applying for', 'Highlight projects that demonstrate impact at scale', 'Prepare for system design and coding interviews', 'Show passion for Google\'s mission'], averageReferralBonus: '$4,000 - $8,000' },
  { slug: 'microsoft', name: 'Microsoft', logo: '💻', industry: 'Technology', headquarters: 'Redmond, WA', description: 'Microsoft is a global technology corporation that develops, manufactures, licenses, supports, and sells software, hardware, cloud services, and more.', referralTips: ['Emphasize collaboration and growth mindset', 'Include metrics from your previous projects', 'Prepare for behavioral interviews using STAR format', 'Research the specific product group'], averageReferralBonus: '$3,000 - $7,000' },
  { slug: 'amazon', name: 'Amazon', logo: '📦', industry: 'E-commerce / Cloud', headquarters: 'Seattle, WA', description: 'Amazon is a multinational technology and e-commerce company focused on cloud computing, digital streaming, artificial intelligence, and online retail.', referralTips: ['Master the Leadership Principles', 'Prepare 5-7 STAR stories covering different LPs', 'Practice coding problems on LeetCode', 'Show ownership and bias for action'], averageReferralBonus: '$3,000 - $6,000' },
  { slug: 'meta', name: 'Meta', logo: '👥', industry: 'Social Media / Technology', headquarters: 'Menlo Park, CA', description: 'Meta (formerly Facebook) builds technologies that help people connect, find communities, and grow businesses through apps like Facebook, Instagram, and WhatsApp.', referralTips: ['Demonstrate impact through metrics', 'Prepare for coding and system design rounds', 'Show interest in connecting people', 'Practice behavioral questions'], averageReferralBonus: '$4,000 - $8,000' },
  { slug: 'apple', name: 'Apple', logo: '🍎', industry: 'Technology / Hardware', headquarters: 'Cupertino, CA', description: 'Apple designs and manufactures smartphones, personal computers, tablets, wearables, and accessories, and sells a variety of related services.', referralTips: ['Show attention to detail and craft', 'Prepare for algorithm-heavy coding rounds', 'Demonstrate passion for user experience', 'Research the specific team\'s products'], averageReferralBonus: '$5,000 - $10,000' },
  { slug: 'netflix', name: 'Netflix', logo: '🎬', industry: 'Entertainment / Streaming', headquarters: 'Los Gatos, CA', description: 'Netflix is a global streaming entertainment service offering a wide variety of TV series, documentaries, and feature films.', referralTips: ['Emphasize freedom and responsibility culture', 'Show impact through concrete metrics', 'Prepare for deep-dive technical discussions', 'Demonstrate strong opinions held loosely'], averageReferralBonus: '$5,000 - $12,000' },
  { slug: 'spotify', name: 'Spotify', logo: '🎵', industry: 'Music / Streaming', headquarters: 'Stockholm, Sweden', description: 'Spotify is a digital music, podcast, and video service that gives you access to millions of songs and other content from creators all over the world.', referralTips: ['Show passion for audio and music', 'Demonstrate autonomous work style', 'Prepare for guild and squad-based culture questions', 'Highlight cross-functional collaboration'], averageReferralBonus: '$3,000 - $6,000' },
  { slug: 'uber', name: 'Uber', logo: '🚗', industry: 'Transportation / Technology', headquarters: 'San Francisco, CA', description: 'Uber develops and operates proprietary technology applications supporting a variety of services including ride-sharing, food delivery, and freight.', referralTips: ['Show understanding of marketplace dynamics', 'Prepare for system design at scale', 'Demonstrate data-driven decision making', 'Highlight impact on user experience'], averageReferralBonus: '$3,000 - $7,000' },
  { slug: 'airbnb', name: 'Airbnb', logo: '🏠', industry: 'Travel / Hospitality', headquarters: 'San Francisco, CA', description: 'Airbnb operates an online marketplace for lodging, experiences, and tourism activities, connecting travelers with hosts worldwide.', referralTips: ['Demonstrate belonging and community focus', 'Show creative problem-solving skills', 'Prepare for product sense interviews', 'Research Airbnb\'s design philosophy'], averageReferralBonus: '$3,000 - $7,000' },
  { slug: 'linkedin', name: 'LinkedIn', logo: '💼', industry: 'Professional Networking', headquarters: 'Sunnyvale, CA', description: 'LinkedIn is a business and employment-oriented social networking service that operates via websites and mobile apps.', referralTips: ['Show passion for connecting professionals', 'Prepare for Microsoft-level coding rounds', 'Demonstrate understanding of professional networks', 'Highlight data-driven product decisions'], averageReferralBonus: '$3,000 - $7,000' },
  { slug: 'salesforce', name: 'Salesforce', logo: '☁️', industry: 'Cloud / CRM', headquarters: 'San Francisco, CA', description: 'Salesforce is a cloud-based software company that provides customer relationship management service and a complementary suite of enterprise applications.', referralTips: ['Show passion for customer success', 'Prepare for Ohana culture questions', 'Demonstrate understanding of enterprise software', 'Highlight trailblazer mentality'], averageReferralBonus: '$3,000 - $6,000' },
  { slug: 'adobe', name: 'Adobe', logo: '🎨', industry: 'Software / Creative', headquarters: 'San Jose, CA', description: 'Adobe Inc. is a multinational computer software company headquartered in San Jose, California, known for creative software and digital experience solutions.', referralTips: ['Show creative and technical intersection', 'Prepare for full-stack coding challenges', 'Demonstrate passion for design tools', 'Highlight customer-centric thinking'], averageReferralBonus: '$3,000 - $6,000' },
  { slug: 'nvidia', name: 'NVIDIA', logo: '🟢', industry: 'Hardware / AI', headquarters: 'Santa Clara, CA', description: 'NVIDIA Corporation designs and manufactures graphics processing units (GPUs) for gaming, professional markets, and AI computing.', referralTips: ['Show deep technical expertise', 'Prepare for hardware and software questions', 'Demonstrate understanding of GPU architecture', 'Highlight AI/ML experience if applicable'], averageReferralBonus: '$4,000 - $9,000' },
  { slug: 'tesla', name: 'Tesla', logo: '⚡', industry: 'Automotive / Energy', headquarters: 'Austin, TX', description: 'Tesla designs, manufactures, and sells electric vehicles, solar panels, and battery energy storage systems.', referralTips: ['Show passion for sustainable energy', 'Prepare for fast-paced environment questions', 'Demonstrate hands-on problem solving', 'Highlight ownership and urgency'], averageReferralBonus: '$3,000 - $7,000' },
  { slug: 'bytedance', name: 'ByteDance', logo: '📱', industry: 'Social Media / AI', headquarters: 'Beijing, China', description: 'ByteDance is a Chinese multinational internet technology company operating a range of content platforms including TikTok and Douyin.', referralTips: ['Show understanding of short-form content', 'Prepare for algorithm-heavy interviews', 'Demonstrate global product thinking', 'Highlight data analysis skills'], averageReferralBonus: '$3,000 - $7,000' },
  { slug: 'stripe', name: 'Stripe', logo: '💳', industry: 'Fintech / Payments', headquarters: 'San Francisco, CA', description: 'Stripe is a financial infrastructure platform for businesses, providing payment processing solutions and tools for online commerce.', referralTips: ['Show understanding of payment systems', 'Prepare for rigorous coding interviews', 'Demonstrate developer-first mindset', 'Highlight understanding of financial infrastructure'], averageReferralBonus: '$5,000 - $10,000' },
  { slug: 'shopify', name: 'Shopify', logo: '🛒', industry: 'E-commerce / SaaS', headquarters: 'Ottawa, Canada', description: 'Shopify is a multinational e-commerce company that provides a platform for online stores and retail point-of-sale systems.', referralTips: ['Show entrepreneurial mindset', 'Prepare for merchant-first thinking', 'Demonstrate understanding of commerce', 'Highlight full-stack capabilities'], averageReferralBonus: '$3,000 - $7,000' },
  { slug: 'twitter', name: 'Twitter / X', logo: '🐦', industry: 'Social Media', headquarters: 'San Francisco, CA', description: 'Twitter (now X) is a social networking service for broadcasting short messages called tweets to a wide audience.', referralTips: ['Show understanding of public conversation', 'Prepare for real-time system challenges', 'Demonstrate passion for free speech', 'Highlight scaling experience'], averageReferralBonus: '$3,000 - $7,000' },
  { slug: 'snap', name: 'Snap Inc.', logo: '📸', industry: 'Social Media / AR', headquarters: 'Santa Monica, CA', description: 'Snap Inc. is a camera company that develops popular products like Snapchat, Spectacles, and AR technology.', referralTips: ['Show creative and technical skills', 'Prepare for AR/ML related questions', 'Demonstrate understanding of visual communication', 'Highlight innovation mindset'], averageReferralBonus: '$3,000 - $6,000' },
  { slug: 'pinterest', name: 'Pinterest', logo: '📌', industry: 'Social Media / Discovery', headquarters: 'San Francisco, CA', description: 'Pinterest is a social media platform designed to discover and save ideas through pinned images and videos.', referralTips: ['Show visual thinking and discovery mindset', 'Prepare for recommendation system questions', 'Demonstrate understanding of visual search', 'Highlight user engagement experience'], averageReferralBonus: '$3,000 - $6,000' },
  { slug: 'oracle', name: 'Oracle', logo: '🔴', industry: 'Enterprise Software / Cloud', headquarters: 'Austin, TX', description: 'Oracle Corporation is a multinational computer technology corporation known for its database software, cloud systems, and enterprise software products.', referralTips: ['Show enterprise software understanding', 'Prepare for database and cloud questions', 'Demonstrate business process knowledge', 'Highlight customer success focus'], averageReferralBonus: '$3,000 - $6,000' },
  { slug: 'ibm', name: 'IBM', logo: '🔵', industry: 'Enterprise Technology', headquarters: 'Armonk, NY', description: 'IBM is a multinational technology corporation that produces and sells computer hardware, middleware, and software, and provides hosting and consulting services.', referralTips: ['Show understanding of enterprise needs', 'Prepare for hybrid cloud and AI questions', 'Demonstrate consulting mindset', 'Highlight innovation at scale'], averageReferralBonus: '$3,000 - $6,000' },
  { slug: 'cisco', name: 'Cisco', logo: '🌐', industry: 'Networking / Security', headquarters: 'San Jose, CA', description: 'Cisco Systems designs, manufactures, and sells networking equipment and provides related technology services.', referralTips: ['Show networking and security knowledge', 'Prepare for infrastructure questions', 'Demonstrate understanding of enterprise networking', 'Highlight certification experience if applicable'], averageReferralBonus: '$3,000 - $6,000' },
  { slug: 'intel', name: 'Intel', logo: '英特尔', industry: 'Semiconductors', headquarters: 'Santa Clara, CA', description: 'Intel Corporation is a multinational corporation and technology company that designs and manufactures processors and related technologies.', referralTips: ['Show semiconductor knowledge', 'Prepare for hardware architecture questions', 'Demonstrate understanding of manufacturing', 'Highlight research and development experience'], averageReferralBonus: '$3,000 - $7,000' },
  { slug: 'vmware', name: 'VMware', logo: '🔷', industry: 'Cloud / Virtualization', headquarters: 'Palo Alto, CA', description: 'VMware is a subsidiary that provides cloud computing and virtualization software and services.', referralTips: ['Show virtualization and cloud knowledge', 'Prepare for infrastructure questions', 'Demonstrate understanding of enterprise virtualization', 'Highlight multi-cloud experience'], averageReferralBonus: '$3,000 - $6,000' },
  { slug: 'atlassian', name: 'Atlassian', logo: '🟦', industry: 'Collaboration / SaaS', headquarters: 'Sydney, Australia', description: 'Atlassian creates software for collaboration, including Jira, Confluence, and Trello, used by teams worldwide.', referralTips: ['Show teamwork and collaboration focus', 'Prepare for team culture questions', 'Demonstrate understanding of developer tools', 'Highlight open company values'], averageReferralBonus: '$3,000 - $7,000' },
  { slug: 'databricks', name: 'Databricks', logo: '🔶', industry: 'Data / AI', headquarters: 'San Francisco, CA', description: 'Databricks provides a unified analytics platform for data and AI, built on Apache Spark.', referralTips: ['Show big data and AI expertise', 'Prepare for data engineering questions', 'Demonstrate understanding of lakehouse architecture', 'Highlight data-driven decision making'], averageReferralBonus: '$5,000 - $10,000' },
  { slug: 'snowflake', name: 'Snowflake', logo: '❄️', industry: 'Data / Cloud', headquarters: 'Bozeman, MT', description: 'Snowflake is a cloud-based data warehousing company that provides a platform for data storage, processing, and analytics.', referralTips: ['Show cloud data warehouse knowledge', 'Prepare for SQL and data questions', 'Demonstrate understanding of data sharing', 'Highlight scalability thinking'], averageReferralBonus: '$5,000 - $10,000' },
  { slug: 'palantir', name: 'Palantir', logo: '🔹', industry: 'Data Analytics / Security', headquarters: 'Denver, CO', description: 'Palantir Technologies is a public American software company that specializes in big data analytics.', referralTips: ['Show analytical and problem-solving skills', 'Prepare for case study interviews', 'Demonstrate understanding of complex data systems', 'Highlight mission-driven mindset'], averageReferralBonus: '$4,000 - $8,000' },
  { slug: 'crowdstrike', name: 'CrowdStrike', logo: '🦅', industry: 'Cybersecurity', headquarters: 'Austin, TX', description: 'CrowdStrike provides cloud-delivered endpoint and cloud workload protection.', referralTips: ['Show cybersecurity passion', 'Prepare for threat detection questions', 'Demonstrate understanding of endpoint security', 'Highlight incident response experience'], averageReferralBonus: '$4,000 - $8,000' },
  { slug: 'datadog', name: 'Datadog', logo: '🐕', industry: 'Monitoring / Cloud', headquarters: 'New York, NY', description: 'Datadog provides monitoring and analytics for cloud-scale applications, including infrastructure, APM, and log management.', referralTips: ['Show observability knowledge', 'Prepare for distributed systems questions', 'Demonstrate understanding of monitoring at scale', 'Highlight DevOps experience'], averageReferralBonus: '$4,000 - $8,000' },
  { slug: 'twilio', name: 'Twilio', logo: '🟣', industry: 'Communications / Cloud', headquarters: 'San Francisco, CA', description: 'Twilio provides cloud communications APIs for messaging, voice, video, and email.', referralTips: ['Show API design knowledge', 'Prepare for communication protocol questions', 'Demonstrate understanding of developer experience', 'Highlight building for developers'], averageReferralBonus: '$3,000 - $6,000' },
  { slug: 'cloudflare', name: 'Cloudflare', logo: '🟠', industry: 'CDN / Security', headquarters: 'San Francisco, CA', description: 'Cloudflare provides content delivery network services, DDoS protection, and domain name server services.', referralTips: ['Show networking and security knowledge', 'Prepare for performance optimization questions', 'Demonstrate understanding of internet infrastructure', 'Highlight security-first thinking'], averageReferralBonus: '$4,000 - $8,000' },
  { slug: 'figma', name: 'Figma', logo: '🎯', industry: 'Design / Collaboration', headquarters: 'San Francisco, CA', description: 'Figma is a collaborative interface design tool that runs in the browser and enables real-time collaboration.', referralTips: ['Show design tool understanding', 'Prepare for creative coding questions', 'Demonstrate understanding of collaboration features', 'Highlight multiplayer technology interest'], averageReferralBonus: '$4,000 - $8,000' },
  { slug: 'notion', name: 'Notion', logo: '📝', industry: 'Productivity / SaaS', headquarters: 'San Francisco, CA', description: 'Notion is an all-in-one workspace that combines notes, documents, wikis, project management, and databases.', referralTips: ['Show productivity tool passion', 'Prepare for product thinking questions', 'Demonstrate understanding of knowledge management', 'Highlight user experience focus'], averageReferralBonus: '$4,000 - $8,000' },
  { slug: 'zoom', name: 'Zoom', logo: '📹', industry: 'Video Communications', headquarters: 'San Jose, CA', description: 'Zoom provides videotelephony and online chat services through a cloud-based peer-to-peer software platform.', referralTips: ['Show video technology knowledge', 'Prepare for real-time communication questions', 'Demonstrate understanding of scalability', 'Highlight reliability engineering experience'], averageReferralBonus: '$3,000 - $7,000' },
  { slug: 'slack', name: 'Slack', logo: '💬', industry: 'Communication / SaaS', headquarters: 'San Francisco, CA', description: 'Slack is a business communication platform owned by Salesforce, offering channels, messaging, and integration features.', referralTips: ['Show workplace communication understanding', 'Prepare for integration and API questions', 'Demonstrate understanding of team dynamics', 'Highlight developer productivity focus'], averageReferralBonus: '$3,000 - $6,000' },
  { slug: 'dropbox', name: 'Dropbox', logo: '📦', industry: 'Cloud Storage', headquarters: 'San Francisco, CA', description: 'Dropbox provides file hosting services that offer cloud storage, file synchronization, and client software.', referralTips: ['Show file system knowledge', 'Prepare for sync and storage questions', 'Demonstrate understanding of collaboration', 'Highlight remote work tools experience'], averageReferralBonus: '$3,000 - $6,000' },
  { slug: 'github', name: 'GitHub', logo: '🐙', industry: 'Developer Tools', headquarters: 'San Francisco, CA', description: 'GitHub is a platform for version control and collaboration, hosting millions of repositories and developers.', referralTips: ['Show open source contributions', 'Prepare for developer workflow questions', 'Demonstrate understanding of version control', 'Highlight community building experience'], averageReferralBonus: '$4,000 - $8,000' },
  { slug: 'gitlab', name: 'GitLab', logo: '🦊', industry: 'DevOps / SaaS', headquarters: 'San Francisco, CA', description: 'GitLab provides a complete DevOps platform delivered as a single application, covering the software development lifecycle.', referralTips: ['Show DevOps and CI/CD knowledge', 'Prepare for all-stage development questions', 'Demonstrate understanding of open source', 'Highlight transparency and async work'], averageReferralBonus: '$4,000 - $8,000' },
  { slug: 'redis', name: 'Redis', logo: '🔴', industry: 'Database / Infrastructure', headquarters: 'Mountain View, CA', description: 'Redis is an open-source in-memory data structure store used as a database, cache, message broker, and streaming engine.', referralTips: ['Show database internals knowledge', 'Prepare for distributed systems questions', 'Demonstrate understanding of caching strategies', 'Highlight performance optimization'], averageReferralBonus: '$3,000 - $6,000' },
  { slug: 'mongodb', name: 'MongoDB', logo: '🍃', industry: 'Database', headquarters: 'New York, NY', description: 'MongoDB provides a general-purpose, document-based, distributed database built for modern applications.', referralTips: ['Show NoSQL database knowledge', 'Prepare for document modeling questions', 'Demonstrate understanding of distributed databases', 'Highlight scalability thinking'], averageReferralBonus: '$3,000 - $6,000' },
  { slug: 'elastic', name: 'Elastic', logo: '🟡', industry: 'Search / Analytics', headquarters: 'San Francisco, CA', description: 'Elastic provides search, observability, and security solutions built on the Elastic Stack (Elasticsearch, Kibana, etc.).', referralTips: ['Show search engine knowledge', 'Prepare for distributed search questions', 'Demonstrate understanding of log analytics', 'Highlight real-time data processing'], averageReferralBonus: '$3,000 - $6,000' },
  { slug: 'hashicorp', name: 'HashiCorp', logo: '🟪', industry: 'Cloud Infrastructure', headquarters: 'San Francisco, CA', description: 'HashiCorp provides cloud infrastructure automation tools including Terraform, Vault, Consul, and Nomad.', referralTips: ['Show infrastructure as code knowledge', 'Prepare for cloud architecture questions', 'Demonstrate understanding of multi-cloud', 'Highlight automation mindset'], averageReferralBonus: '$4,000 - $8,000' },
  { slug: 'splunk', name: 'Splunk', logo: '🟠', industry: 'Data Analytics / Security', headquarters: 'San Francisco, CA', description: 'Splunk provides software for searching, monitoring, and analyzing machine-generated big data through a web-style interface.', referralTips: ['Show data analysis skills', 'Prepare for log processing questions', 'Demonstrate understanding of SIEM', 'Highlight security analytics experience'], averageReferralBonus: '$3,000 - $6,000' },
  { slug: 'servicenow', name: 'ServiceNow', logo: '🔵', industry: 'Enterprise Software', headquarters: 'Santa Clara, CA', description: 'ServiceNow provides cloud-based workflow automation platform services for enterprise operations.', referralTips: ['Show enterprise workflow understanding', 'Prepare for platform questions', 'Demonstrate understanding of IT service management', 'Highlight business process automation'], averageReferralBonus: '$3,000 - $6,000' },
  { slug: 'workday', name: 'Workday', logo: '🟦', industry: 'Enterprise Software / HCM', headquarters: 'Pleasanton, CA', description: 'Workday provides enterprise cloud applications for finance, human resources, and planning.', referralTips: ['Show HR tech understanding', 'Prepare for enterprise architecture questions', 'Demonstrate understanding of financial systems', 'Highlight compliance knowledge'], averageReferralBonus: '$3,000 - $6,000' },
]

export const ROLES: RoleData[] = [
  { slug: 'software-engineer', label: 'Software Engineer', description: 'Design, develop, and maintain software applications and systems' },
  { slug: 'frontend-engineer', label: 'Frontend Engineer', description: 'Build user interfaces and client-side applications' },
  { slug: 'backend-engineer', label: 'Backend Engineer', description: 'Develop server-side logic, databases, and APIs' },
  { slug: 'full-stack-engineer', label: 'Full Stack Engineer', description: 'Work across the entire technology stack from frontend to backend' },
  { slug: 'data-engineer', label: 'Data Engineer', description: 'Build and maintain data pipelines and infrastructure' },
  { slug: 'data-scientist', label: 'Data Scientist', description: 'Analyze complex data sets and build machine learning models' },
  { slug: 'machine-learning-engineer', label: 'Machine Learning Engineer', description: 'Develop and deploy ML models and AI systems' },
  { slug: 'devops-engineer', label: 'DevOps Engineer', description: 'Manage CI/CD pipelines, infrastructure, and deployment processes' },
  { slug: 'product-manager', label: 'Product Manager', description: 'Define product strategy, roadmap, and feature requirements' },
  { slug: 'product-designer', label: 'Product Designer', description: 'Design user experiences and interfaces for digital products' },
  { slug: 'ux-designer', label: 'UX Designer', description: 'Research and design user-centered experiences' },
  { slug: 'ui-developer', label: 'UI Developer', description: 'Implement visual designs and interactive interfaces' },
  { slug: 'qa-engineer', label: 'QA Engineer', description: 'Ensure software quality through testing and automation' },
  { slug: 'security-engineer', label: 'Security Engineer', description: 'Protect systems and data from security threats' },
  { slug: 'cloud-engineer', label: 'Cloud Engineer', description: 'Design and manage cloud infrastructure and services' },
  { slug: 'solutions-architect', label: 'Solutions Architect', description: 'Design technical solutions to meet business requirements' },
  { slug: 'technical-program-manager', label: 'Technical Program Manager', description: 'Manage complex technical projects across teams' },
  { slug: 'engineering-manager', label: 'Engineering Manager', description: 'Lead and manage engineering teams' },
  { slug: 'site-reliability-engineer', label: 'Site Reliability Engineer', description: 'Ensure system reliability, performance, and scalability' },
  { slug: 'mobile-engineer', label: 'Mobile Engineer', description: 'Build mobile applications for iOS and Android platforms' },
]

export const LOCATIONS: LocationData[] = [
  { slug: 'bangalore', label: 'Bangalore', country: 'India' },
  { slug: 'hyderabad', label: 'Hyderabad', country: 'India' },
  { slug: 'pune', label: 'Pune', country: 'India' },
  { slug: 'chennai', label: 'Chennai', country: 'India' },
  { slug: 'mumbai', label: 'Mumbai', country: 'India' },
  { slug: 'delhi', label: 'Delhi NCR', country: 'India' },
  { slug: 'gurgaon', label: 'Gurgaon', country: 'India' },
  { slug: 'noida', label: 'Noida', country: 'India' },
  { slug: 'san-francisco', label: 'San Francisco', country: 'USA' },
  { slug: 'new-york', label: 'New York', country: 'USA' },
  { slug: 'seattle', label: 'Seattle', country: 'USA' },
  { slug: 'austin', label: 'Austin', country: 'USA' },
  { slug: 'chicago', label: 'Chicago', country: 'USA' },
  { slug: 'boston', label: 'Boston', country: 'USA' },
  { slug: 'los-angeles', label: 'Los Angeles', country: 'USA' },
  { slug: 'denver', label: 'Denver', country: 'USA' },
  { slug: 'london', label: 'London', country: 'UK' },
  { slug: 'berlin', label: 'Berlin', country: 'Germany' },
  { slug: 'toronto', label: 'Toronto', country: 'Canada' },
  { slug: 'vancouver', label: 'Vancouver', country: 'Canada' },
  { slug: 'singapore', label: 'Singapore', country: 'Singapore' },
  { slug: 'dublin', label: 'Dublin', country: 'Ireland' },
  { slug: 'amsterdam', label: 'Amsterdam', country: 'Netherlands' },
  { slug: 'tokyo', label: 'Tokyo', country: 'Japan' },
  { slug: 'sydney', label: 'Sydney', country: 'Australia' },
  { slug: 'stockholm', label: 'Stockholm', country: 'Sweden' },
]

export function getCompanyBySlug(slug: string): CompanyData | undefined {
  return COMPANIES.find(c => c.slug === slug)
}

export function getRoleBySlug(slug: string): RoleData | undefined {
  return ROLES.find(r => r.slug === slug)
}

export function getLocationBySlug(slug: string): LocationData | undefined {
  return LOCATIONS.find(l => l.slug === slug)
}

export function getAllReferralSlugs(): Array<{ company: string; role?: string; location?: string }> {
  const slugs: Array<{ company: string; role?: string; location?: string }> = []

  for (const company of COMPANIES) {
    slugs.push({ company: company.slug })
  }

  return slugs
}
