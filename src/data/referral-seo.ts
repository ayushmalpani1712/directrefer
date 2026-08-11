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
  { slug: 'google-india', name: 'Google India', logo: '🔍', industry: 'Technology', headquarters: 'Bangalore', description: 'Google India is the Indian subsidiary of Google, offering search, cloud, AI, and advertising services.', referralTips: ['Tailor your resume to the specific team', 'Highlight projects demonstrating impact at scale', 'Prepare for system design and coding interviews', 'Show passion for Google\'s mission'], averageReferralBonus: '₹2,00,000 - ₹5,00,000' },
  { slug: 'microsoft-india', name: 'Microsoft India', logo: '💻', industry: 'Technology', headquarters: 'Hyderabad', description: 'Microsoft India develops and supports products including Azure, Office 365, and enterprise solutions.', referralTips: ['Emphasize collaboration and growth mindset', 'Include metrics from previous projects', 'Prepare for behavioral interviews using STAR format', 'Research the specific product group'], averageReferralBonus: '₹1,50,000 - ₹4,00,000' },
  { slug: 'amazon-india', name: 'Amazon India', logo: '📦', industry: 'E-commerce / Cloud', headquarters: 'Hyderabad', description: 'Amazon India operates e-commerce, AWS cloud services, and digital entertainment platforms.', referralTips: ['Master the Leadership Principles', 'Prepare 5-7 STAR stories covering different LPs', 'Practice coding problems on LeetCode', 'Show ownership and bias for action'], averageReferralBonus: '₹1,50,000 - ₹4,00,000' },
  { slug: 'flipkart', name: 'Flipkart', logo: '🛒', industry: 'E-commerce', headquarters: 'Bangalore', description: 'Flipkart is India\'s leading e-commerce marketplace, offering electronics, fashion, and grocery products.', referralTips: ['Show understanding of Indian e-commerce market', 'Prepare for scale-related system design', 'Demonstrate data-driven decision making', 'Highlight customer obsession'], averageReferralBonus: '₹1,50,000 - ₹4,00,000' },
  { slug: 'infosys', name: 'Infosys', logo: '🟦', industry: 'IT Services', headquarters: 'Bangalore', description: 'Infosys is a global leader in digital services and consulting, serving clients across industries.', referralTips: ['Show consulting and client delivery skills', 'Prepare for domain-specific questions', 'Demonstrate understanding of enterprise projects', 'Highlight certifications and learning agility'], averageReferralBonus: '₹50,000 - ₹1,50,000' },
  { slug: 'tcs', name: 'TCS', logo: '🟠', industry: 'IT Services', headquarters: 'Mumbai', description: 'Tata Consultancy Services is an IT services and consulting company, part of the Tata Group.', referralTips: ['Show understanding of IT service delivery', 'Prepare for aptitude and technical rounds', 'Demonstrate teamwork and client focus', 'Highlight domain expertise'], averageReferralBonus: '₹50,000 - ₹1,50,000' },
  { slug: 'wipro', name: 'Wipro', logo: '🔵', industry: 'IT Services', headquarters: 'Bangalore', description: 'Wipro is a leading global information technology, consulting, and business process services company.', referralTips: ['Show IT services knowledge', 'Prepare for technical and HR rounds', 'Demonstrate problem-solving skills', 'Highlight certifications'], averageReferralBonus: '₹50,000 - ₹1,50,000' },
  { slug: 'hcltech', name: 'HCL Technologies', logo: '🔴', industry: 'IT Services', headquarters: 'Noida', description: 'HCLTech is a global technology company serving clients across industries with IT and business services.', referralTips: ['Show technical depth in your domain', 'Prepare for client-facing scenario questions', 'Demonstrate learning ability', 'Highlight project management skills'], averageReferralBonus: '₹50,000 - ₹1,50,000' },
  { slug: 'tech-mahindra', name: 'Tech Mahindra', logo: '🟢', industry: 'IT Services', headquarters: 'Pune', description: 'Tech Mahindra provides IT services and solutions to industries including telecom, healthcare, and banking.', referralTips: ['Show domain knowledge in target industry', 'Prepare for technical assessment', 'Demonstrate communication skills', 'Highlight relevant certifications'], averageReferralBonus: '₹50,000 - ₹1,50,000' },
  { slug: 'reliance-jio', name: 'Reliance Jio', logo: '📱', industry: 'Telecom / Technology', headquarters: 'Mumbai', description: 'Reliance Jio is India\'s largest telecom provider, expanding into digital services, 5G, and cloud.', referralTips: ['Show understanding of Indian telecom market', 'Prepare for scale and reliability questions', 'Demonstrate innovation mindset', 'Highlight experience with high-scale systems'], averageReferralBonus: '₹1,00,000 - ₹3,00,000' },
  { slug: 'zomato', name: 'Zomato', logo: '🍔', industry: 'Food Delivery / Tech', headquarters: 'Gurgaon', description: 'Zomato is India\'s leading food delivery and restaurant discovery platform.', referralTips: ['Show understanding of Indian food-tech market', 'Prepare for real-time system design', 'Demonstrate data analytics skills', 'Highlight customer experience focus'], averageReferralBonus: '₹1,00,000 - ₹3,00,000' },
  { slug: 'swiggy', name: 'Swiggy', logo: '🛵', industry: 'Food Delivery / Tech', headquarters: 'Bangalore', description: 'Swiggy is a leading Indian food delivery and quick-commerce platform.', referralTips: ['Show understanding of logistics and supply chain', 'Prepare for real-time system questions', 'Demonstrate problem-solving at scale', 'Highlight operational efficiency thinking'], averageReferralBonus: '₹1,00,000 - ₹3,00,000' },
  { slug: 'razorpay', name: 'Razorpay', logo: '💳', industry: 'Fintech', headquarters: 'Bangalore', description: 'Razorpay is India\'s leading full-stack financial solutions company for businesses.', referralTips: ['Show understanding of Indian payment ecosystem', 'Prepare for security and compliance questions', 'Demonstrate API design thinking', 'Highlight fintech domain knowledge'], averageReferralBonus: '₹1,50,000 - ₹4,00,000' },
  { slug: 'phonepe', name: 'PhonePe', logo: '📱', industry: 'Fintech / Payments', headquarters: 'Bangalore', description: 'PhonePe is one of India\'s largest digital payments platforms, built on UPI.', referralTips: ['Show UPI and digital payments knowledge', 'Prepare for scale and security questions', 'Demonstrate understanding of Indian fintech', 'Highlight user experience thinking'], averageReferralBonus: '₹1,50,000 - ₹4,00,000' },
  { slug: 'paytm', name: 'Paytm', logo: '💰', industry: 'Fintech', headquarters: 'Noida', description: 'Paytm is India\'s leading digital payments and financial services company.', referralTips: ['Show fintech and payments knowledge', 'Prepare for compliance and regulatory questions', 'Demonstrate understanding of Indian market', 'Highlight product thinking'], averageReferralBonus: '₹1,00,000 - ₹3,00,000' },
  { slug: 'freshworks', name: 'Freshworks', logo: '🟠', industry: 'SaaS', headquarters: 'Chennai', description: 'Freshworks provides SaaS solutions for customer service, IT, and marketing.', referralTips: ['Show SaaS product knowledge', 'Prepare for customer success questions', 'Demonstrate understanding of B2B software', 'Highlight product-led growth thinking'], averageReferralBonus: '₹1,50,000 - ₹4,00,000' },
  { slug: 'zoho', name: 'Zoho', logo: '🟣', industry: 'SaaS', headquarters: 'Chennai', description: 'Zoho offers a suite of online business, collaboration, and productivity tools.', referralTips: ['Show understanding of SaaS ecosystem', 'Prepare for full-stack development questions', 'Demonstrate product thinking', 'Highlight bootstrapped company culture fit'], averageReferralBonus: '₹1,00,000 - ₹3,00,000' },
  { slug: 'mindtree', name: 'Mindtree', logo: '🌳', industry: 'IT Services', headquarters: 'Bangalore', description: 'Mindtree is a global technology consulting and services company, now part of LTIMindtree.', referralTips: ['Show consulting and delivery skills', 'Prepare for client engagement questions', 'Demonstrate technical expertise', 'Highlight agile methodology experience'], averageReferralBonus: '₹50,000 - ₹1,50,000' },
  { slug: 'persistent-systems', name: 'Persistent Systems', logo: '🔷', industry: 'IT Services / Product', headquarters: 'Pune', description: 'Persistent Systems provides software product development and technology services.', referralTips: ['Show product engineering skills', 'Prepare for technical depth questions', 'Demonstrate innovation mindset', 'Highlight product lifecycle knowledge'], averageReferralBonus: '₹75,000 - ₹2,00,000' },
  { slug: 'cognizant-india', name: 'Cognizant India', logo: '🔵', industry: 'IT Services', headquarters: 'Chennai', description: 'Cognizant is a leading professional services company transforming business through technology.', referralTips: ['Show IT services and consulting skills', 'Prepare for domain-specific questions', 'Demonstrate client delivery experience', 'Highlight certifications and training'], averageReferralBonus: '₹50,000 - ₹1,50,000' },
  { slug: 'accenture-india', name: 'Accenture India', logo: '▸', industry: 'Consulting / Technology', headquarters: 'Bangalore', description: 'Accenture is a global professional services company with extensive operations in India.', referralTips: ['Show consulting and strategy skills', 'Prepare for case study interviews', 'Demonstrate industry knowledge', 'Highlight leadership and teamwork'], averageReferralBonus: '₹1,00,000 - ₹3,00,000' },
  { slug: 'goldman-sachs-india', name: 'Goldman Sachs India', logo: '🏦', industry: 'Finance', headquarters: 'Bangalore', description: 'Goldman Sachs has major technology and operations centers in Bangalore and Hyderabad.', referralTips: ['Show financial services knowledge', 'Prepare for quantitative and technical rounds', 'Demonstrate analytical thinking', 'Highlight risk management understanding'], averageReferralBonus: '₹2,00,000 - ₹5,00,000' },
  { slug: 'jp-morgan-india', name: 'JP Morgan India', logo: '🏛️', industry: 'Finance', headquarters: 'Mumbai', description: 'JP Morgan Chase has technology, operations, and asset management offices across India.', referralTips: ['Show financial technology knowledge', 'Prepare for system design at scale', 'Demonstrate compliance awareness', 'Highlight data processing experience'], averageReferralBonus: '₹2,00,000 - ₹5,00,000' },
  { slug: 'morgan-stanley-india', name: 'Morgan Stanley India', logo: '📊', industry: 'Finance', headquarters: 'Mumbai', description: 'Morgan Stanley has technology and operations centers in Mumbai, Pune, and Chennai.', referralTips: ['Show financial markets knowledge', 'Prepare for quantitative problem solving', 'Demonstrate risk management thinking', 'Highlight high-performance computing experience'], averageReferralBonus: '₹2,00,000 - ₹5,00,000' },
  { slug: 'uber-india', name: 'Uber India', logo: '🚗', industry: 'Transportation / Tech', headquarters: 'Hyderabad', description: 'Uber has major engineering and operations centers in Hyderabad and Bangalore.', referralTips: ['Show understanding of marketplace dynamics', 'Prepare for system design at scale', 'Demonstrate data-driven decision making', 'Highlight impact on user experience'], averageReferralBonus: '₹1,50,000 - ₹4,00,000' },
  { slug: 'walmart-india', name: 'Walmart India', logo: '🏪', industry: 'Retail / Technology', headquarters: 'Bangalore', description: 'Walmart Global Tech India develops technology solutions for Walmart\'s global operations.', referralTips: ['Show retail tech and e-commerce knowledge', 'Prepare for supply chain system questions', 'Demonstrate data analytics skills', 'Highlight cost optimization thinking'], averageReferralBonus: '₹1,50,000 - ₹4,00,000' },
  { slug: 'atlassian-india', name: 'Atlassian India', logo: '🟦', industry: 'Collaboration / SaaS', headquarters: 'Bangalore', description: 'Atlassian has a major engineering center in Bangalore building tools like Jira and Confluence.', referralTips: ['Show teamwork and collaboration focus', 'Prepare for team culture questions', 'Demonstrate understanding of developer tools', 'Highlight open company values'], averageReferralBonus: '₹1,50,000 - ₹4,00,000' },
  { slug: 'salesforce-india', name: 'Salesforce India', logo: '☁️', industry: 'Cloud / CRM', headquarters: 'Hyderabad', description: 'Salesforce has offices in Hyderabad and Bangalore for CRM and cloud platform development.', referralTips: ['Show passion for customer success', 'Prepare for cloud architecture questions', 'Demonstrate understanding of enterprise software', 'Highlight trailblazer mentality'], averageReferralBonus: '₹1,50,000 - ₹4,00,000' },
  { slug: 'adobe-india', name: 'Adobe India', logo: '🎨', industry: 'Software / Creative', headquarters: 'Bangalore', description: 'Adobe India develops creative software, digital experience solutions, and document cloud products.', referralTips: ['Show creative and technical intersection', 'Prepare for full-stack coding challenges', 'Demonstrate passion for design tools', 'Highlight customer-centric thinking'], averageReferralBonus: '₹1,50,000 - ₹4,00,000' },
  { slug: 'nvidia-india', name: 'NVIDIA India', logo: '🟢', industry: 'Hardware / AI', headquarters: 'Hyderabad', description: 'NVIDIA India works on GPU computing, AI, and deep learning technologies.', referralTips: ['Show deep technical expertise', 'Prepare for hardware and software questions', 'Demonstrate understanding of GPU architecture', 'Highlight AI/ML experience'], averageReferralBonus: '₹2,00,000 - ₹5,00,000' },
  { slug: 'cisco-india', name: 'Cisco India', logo: '🌐', industry: 'Networking / Security', headquarters: 'Bangalore', description: 'Cisco India develops networking, security, and collaboration solutions.', referralTips: ['Show networking and security knowledge', 'Prepare for infrastructure questions', 'Demonstrate understanding of enterprise networking', 'Highlight certification experience'], averageReferralBonus: '₹1,50,000 - ₹3,50,000' },
  { slug: 'ibm-india', name: 'IBM India', logo: '🔵', industry: 'Enterprise Technology', headquarters: 'Bangalore', description: 'IBM India develops cloud, AI, and enterprise solutions for global markets.', referralTips: ['Show enterprise software understanding', 'Prepare for hybrid cloud and AI questions', 'Demonstrate consulting mindset', 'Highlight innovation at scale'], averageReferralBonus: '₹1,00,000 - ₹3,00,000' },
  { slug: 'oracle-india', name: 'Oracle India', logo: '🔴', industry: 'Enterprise Software / Cloud', headquarters: 'Bangalore', description: 'Oracle India develops database, cloud, and enterprise software solutions.', referralTips: ['Show enterprise software understanding', 'Prepare for database and cloud questions', 'Demonstrate business process knowledge', 'Highlight customer success focus'], averageReferralBonus: '₹1,00,000 - ₹3,00,000' },
  { slug: 'sap-india', name: 'SAP India', logo: '🟠', industry: 'Enterprise Software', headquarters: 'Bangalore', description: 'SAP India provides enterprise application software and cloud solutions.', referralTips: ['Show enterprise software knowledge', 'Prepare for ERP and business process questions', 'Demonstrate understanding of digital transformation', 'Highlight industry-specific experience'], averageReferralBonus: '₹1,00,000 - ₹3,00,000' },
  { slug: 'vmware-india', name: 'VMware India', logo: '🔷', industry: 'Cloud / Virtualization', headquarters: 'Bangalore', description: 'VMware India works on virtualization, cloud, and edge computing solutions.', referralTips: ['Show virtualization and cloud knowledge', 'Prepare for infrastructure questions', 'Demonstrate understanding of enterprise virtualization', 'Highlight multi-cloud experience'], averageReferralBonus: '₹1,50,000 - ₹3,50,000' },
  { slug: 'databricks-india', name: 'Databricks India', logo: '🔶', industry: 'Data / AI', headquarters: 'Bangalore', description: 'Databricks India provides unified analytics platform for data and AI.', referralTips: ['Show big data and AI expertise', 'Prepare for data engineering questions', 'Demonstrate understanding of lakehouse architecture', 'Highlight data-driven decision making'], averageReferralBonus: '₹2,00,000 - ₹5,00,000' },
  { slug: 'snowflake-india', name: 'Snowflake India', logo: '❄️', industry: 'Data / Cloud', headquarters: 'Bangalore', description: 'Snowflake India provides cloud-based data warehousing solutions.', referralTips: ['Show cloud data warehouse knowledge', 'Prepare for SQL and data questions', 'Demonstrate understanding of data sharing', 'Highlight scalability thinking'], averageReferralBonus: '₹2,00,000 - ₹5,00,000' },
  { slug: 'palantir-india', name: 'Palantir India', logo: '🔹', industry: 'Data Analytics', headquarters: 'Bangalore', description: 'Palantir India provides data analytics platforms for government and enterprise.', referralTips: ['Show analytical and problem-solving skills', 'Prepare for case study interviews', 'Demonstrate understanding of complex data systems', 'Highlight mission-driven mindset'], averageReferralBonus: '₹2,00,000 - ₹5,00,000' },
  { slug: 'crowdstrike-india', name: 'CrowdStrike India', logo: '🦅', industry: 'Cybersecurity', headquarters: 'Bangalore', description: 'CrowdStrike India provides cloud-delivered endpoint and cloud workload protection.', referralTips: ['Show cybersecurity passion', 'Prepare for threat detection questions', 'Demonstrate understanding of endpoint security', 'Highlight incident response experience'], averageReferralBonus: '₹2,00,000 - ₹5,00,000' },
  { slug: 'freshworks-india', name: 'Freshworks India', logo: '🟠', industry: 'SaaS', headquarters: 'Chennai', description: 'Freshworks provides SaaS solutions for customer service, IT, and marketing.', referralTips: ['Show SaaS product knowledge', 'Prepare for customer success questions', 'Demonstrate understanding of B2B software', 'Highlight product-led growth thinking'], averageReferralBonus: '₹1,50,000 - ₹4,00,000' },
  { slug: 'bytedance-india', name: 'ByteDance India', logo: '📱', industry: 'Social Media / AI', headquarters: 'Bangalore', description: 'ByteDance has engineering centers in Bangalore working on content recommendation and AI.', referralTips: ['Show understanding of content platforms', 'Prepare for algorithm-heavy interviews', 'Demonstrate global product thinking', 'Highlight data analysis skills'], averageReferralBonus: '₹1,50,000 - ₹4,00,000' },
  { slug: 'linkedin-india', name: 'LinkedIn India', logo: '💼', industry: 'Professional Networking', headquarters: 'Bangalore', description: 'LinkedIn India has major engineering and product teams in Bangalore.', referralTips: ['Show passion for connecting professionals', 'Prepare for Microsoft-level coding rounds', 'Demonstrate understanding of professional networks', 'Highlight data-driven product decisions'], averageReferralBonus: '₹1,50,000 - ₹4,00,000' },
  { slug: 'snap-india', name: 'Snap India', logo: '📸', industry: 'Social Media / AR', headquarters: 'Mumbai', description: 'Snap Inc. has engineering and business teams in India for Snapchat.', referralTips: ['Show creative and technical skills', 'Prepare for AR/ML related questions', 'Demonstrate understanding of visual communication', 'Highlight innovation mindset'], averageReferralBonus: '₹1,50,000 - ₹3,50,000' },
  { slug: 'spotify-india', name: 'Spotify India', logo: '🎵', industry: 'Music / Streaming', headquarters: 'Mumbai', description: 'Spotify India manages content, marketing, and engineering for the Indian market.', referralTips: ['Show passion for audio and music', 'Demonstrate autonomous work style', 'Prepare for guild and squad-based culture', 'Highlight cross-functional collaboration'], averageReferralBonus: '₹1,50,000 - ₹3,50,000' },
  { slug: 'mongodb-india', name: 'MongoDB India', logo: '🍃', industry: 'Database', headquarters: 'Bangalore', description: 'MongoDB India provides document database solutions and support.', referralTips: ['Show NoSQL database knowledge', 'Prepare for document modeling questions', 'Demonstrate understanding of distributed databases', 'Highlight scalability thinking'], averageReferralBonus: '₹1,50,000 - ₹3,50,000' },
  { slug: 'hashicorp-india', name: 'HashiCorp India', logo: '🟪', industry: 'Cloud Infrastructure', headquarters: 'Bangalore', description: 'HashiCorp India works on infrastructure automation tools like Terraform and Vault.', referralTips: ['Show infrastructure as code knowledge', 'Prepare for cloud architecture questions', 'Demonstrate understanding of multi-cloud', 'Highlight automation mindset'], averageReferralBonus: '₹1,50,000 - ₹4,00,000' },
  { slug: 'elastic-india', name: 'Elastic India', logo: '🟡', industry: 'Search / Analytics', headquarters: 'Bangalore', description: 'Elastic India provides search, observability, and security solutions.', referralTips: ['Show search engine knowledge', 'Prepare for distributed search questions', 'Demonstrate understanding of log analytics', 'Highlight real-time data processing'], averageReferralBonus: '₹1,50,000 - ₹3,50,000' },
  { slug: 'servicenow-india', name: 'ServiceNow India', logo: '🔵', industry: 'Enterprise Software', headquarters: 'Hyderabad', description: 'ServiceNow India develops cloud-based workflow automation platforms.', referralTips: ['Show enterprise workflow understanding', 'Prepare for platform questions', 'Demonstrate understanding of IT service management', 'Highlight business process automation'], averageReferralBonus: '₹1,50,000 - ₹3,50,000' },
  { slug: 'workday-india', name: 'Workday India', logo: '🟦', industry: 'Enterprise Software / HCM', headquarters: 'Hyderabad', description: 'Workday India develops enterprise cloud applications for finance and HR.', referralTips: ['Show HR tech understanding', 'Prepare for enterprise architecture questions', 'Demonstrate understanding of financial systems', 'Highlight compliance knowledge'], averageReferralBonus: '₹1,50,000 - ₹3,50,000' },
  { slug: 'linkedin-india', name: 'LinkedIn India', logo: '💼', industry: 'Professional Networking', headquarters: 'Bangalore', description: 'LinkedIn India has major engineering and product teams in Bangalore.', referralTips: ['Show passion for connecting professionals', 'Prepare for Microsoft-level coding rounds', 'Demonstrate understanding of professional networks', 'Highlight data-driven product decisions'], averageReferralBonus: '₹1,50,000 - ₹4,00,000' },
  { slug: 'uber-india', name: 'Uber India', logo: '🚗', industry: 'Transportation / Tech', headquarters: 'Hyderabad', description: 'Uber has major engineering and operations centers in Hyderabad and Bangalore.', referralTips: ['Show understanding of marketplace dynamics', 'Prepare for system design at scale', 'Demonstrate data-driven decision making', 'Highlight impact on user experience'], averageReferralBonus: '₹1,50,000 - ₹4,00,000' },
]

export const ROLES: RoleData[] = [
  { slug: 'software-engineer', label: 'Software Engineer', description: 'Design, develop, and maintain software applications and systems' },
  { slug: 'frontend-engineer', label: 'Frontend Engineer', description: 'Build user interfaces and client-side applications' },
  { slug: 'backend-engineer', label: 'Backend Engineer', description: 'Develop server-side logic, databases, and APIs' },
  { slug: 'full-stack-engineer', label: 'Full Stack Engineer', description: 'Work across the entire technology stack from frontend to backend' },
  { slug: 'data-engineer', label: 'Data Engineer', description: 'Build and maintain data pipelines and infrastructure' },
  { slug: 'data-scientist', label: 'Data Scientist', description: 'Analyze complex data sets and build machine learning models' },
  { slug: 'machine-learning-engineer', label: 'ML Engineer', description: 'Develop and deploy ML models and AI systems' },
  { slug: 'devops-engineer', label: 'DevOps Engineer', description: 'Manage CI/CD pipelines, infrastructure, and deployment processes' },
  { slug: 'product-manager', label: 'Product Manager', description: 'Define product strategy, roadmap, and feature requirements' },
  { slug: 'product-designer', label: 'Product Designer', description: 'Design user experiences and interfaces for digital products' },
  { slug: 'ux-designer', label: 'UX Designer', description: 'Research and design user-centered experiences' },
  { slug: 'qa-engineer', label: 'QA Engineer', description: 'Ensure software quality through testing and automation' },
  { slug: 'security-engineer', label: 'Security Engineer', description: 'Protect systems and data from security threats' },
  { slug: 'cloud-engineer', label: 'Cloud Engineer', description: 'Design and manage cloud infrastructure and services' },
  { slug: 'solutions-architect', label: 'Solutions Architect', description: 'Design technical solutions to meet business requirements' },
  { slug: 'engineering-manager', label: 'Engineering Manager', description: 'Lead and manage engineering teams' },
  { slug: 'site-reliability-engineer', label: 'SRE', description: 'Ensure system reliability, performance, and scalability' },
  { slug: 'mobile-engineer', label: 'Mobile Engineer', description: 'Build mobile applications for iOS and Android platforms' },
]

export const LOCATIONS: LocationData[] = [
  { slug: 'bangalore', label: 'Bangalore', country: 'India' },
  { slug: 'hyderabad', label: 'Hyderabad', country: 'India' },
  { slug: 'pune', label: 'Pune', country: 'India' },
  { slug: 'chennai', label: 'Chennai', country: 'India' },
  { slug: 'mumbai', label: 'Mumbai', country: 'India' },
  { slug: 'delhi-ncr', label: 'Delhi NCR', country: 'India' },
  { slug: 'gurgaon', label: 'Gurgaon', country: 'India' },
  { slug: 'noida', label: 'Noida', country: 'India' },
  { slug: 'kolkata', label: 'Kolkata', country: 'India' },
  { slug: 'ahmedabad', label: 'Ahmedabad', country: 'India' },
  { slug: 'jaipur', label: 'Jaipur', country: 'India' },
  { slug: 'kochi', label: 'Kochi', country: 'India' },
  { slug: 'thiruvananthapuram', label: 'Thiruvananthapuram', country: 'India' },
  { slug: 'mysore', label: 'Mysore', country: 'India' },
  { slug: 'coimbatore', label: 'Coimbatore', country: 'India' },
  { slug: 'chandigarh', label: 'Chandigarh', country: 'India' },
  { slug: 'indore', label: 'Indore', country: 'India' },
  { slug: 'nagpur', label: 'Nagpur', country: 'India' },
  { slug: 'vadodara', label: 'Vadodara', country: 'India' },
  { slug: 'lucknow', label: 'Lucknow', country: 'India' },
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
