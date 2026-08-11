export interface CompanyData {
  slug: string
  name: string
  logo: string
  industry: string
  headquarters: string
  description: string
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
  { slug: 'google-india', name: 'Google India', logo: '🔍', industry: 'Technology', headquarters: 'Bangalore', description: 'Google India is the Indian subsidiary of Google, offering search, cloud, AI, and advertising services.' },
  { slug: 'microsoft-india', name: 'Microsoft India', logo: '💻', industry: 'Technology', headquarters: 'Hyderabad', description: 'Microsoft India develops and supports products including Azure, Office 365, and enterprise solutions.' },
  { slug: 'amazon-india', name: 'Amazon India', logo: '📦', industry: 'E-commerce / Cloud', headquarters: 'Hyderabad', description: 'Amazon India operates e-commerce, AWS cloud services, and digital entertainment platforms.' },
  { slug: 'flipkart', name: 'Flipkart', logo: '🛒', industry: 'E-commerce', headquarters: 'Bangalore', description: 'Flipkart is India\'s leading e-commerce marketplace, offering electronics, fashion, and grocery products.' },
  { slug: 'infosys', name: 'Infosys', logo: '🟦', industry: 'IT Services', headquarters: 'Bangalore', description: 'Infosys is a global leader in digital services and consulting, serving clients across industries.' },
  { slug: 'tcs', name: 'TCS', logo: '🟠', industry: 'IT Services', headquarters: 'Mumbai', description: 'Tata Consultancy Services is an IT services and consulting company, part of the Tata Group.' },
  { slug: 'wipro', name: 'Wipro', logo: '🔵', industry: 'IT Services', headquarters: 'Bangalore', description: 'Wipro is a leading global information technology, consulting, and business process services company.' },
  { slug: 'hcltech', name: 'HCL Technologies', logo: '🔴', industry: 'IT Services', headquarters: 'Noida', description: 'HCLTech is a global technology company serving clients across industries with IT and business services.' },
  { slug: 'tech-mahindra', name: 'Tech Mahindra', logo: '🟢', industry: 'IT Services', headquarters: 'Pune', description: 'Tech Mahindra provides IT services and solutions to industries including telecom, healthcare, and banking.' },
  { slug: 'reliance-jio', name: 'Reliance Jio', logo: '📱', industry: 'Telecom / Technology', headquarters: 'Mumbai', description: 'Reliance Jio is India\'s largest telecom provider, expanding into digital services, 5G, and cloud.' },
  { slug: 'zomato', name: 'Zomato', logo: '🍔', industry: 'Food Delivery / Tech', headquarters: 'Gurgaon', description: 'Zomato is India\'s leading food delivery and restaurant discovery platform.' },
  { slug: 'swiggy', name: 'Swiggy', logo: '🛵', industry: 'Food Delivery / Tech', headquarters: 'Bangalore', description: 'Swiggy is a leading Indian food delivery and quick-commerce platform.' },
  { slug: 'razorpay', name: 'Razorpay', logo: '💳', industry: 'Fintech', headquarters: 'Bangalore', description: 'Razorpay is India\'s leading full-stack financial solutions company for businesses.' },
  { slug: 'phonepe', name: 'PhonePe', logo: '📱', industry: 'Fintech / Payments', headquarters: 'Bangalore', description: 'PhonePe is one of India\'s largest digital payments platforms, built on UPI.' },
  { slug: 'paytm', name: 'Paytm', logo: '💰', industry: 'Fintech', headquarters: 'Noida', description: 'Paytm is India\'s leading digital payments and financial services company.' },
  { slug: 'freshworks', name: 'Freshworks', logo: '🟠', industry: 'SaaS', headquarters: 'Chennai', description: 'Freshworks provides SaaS solutions for customer service, IT, and marketing.' },
  { slug: 'zoho', name: 'Zoho', logo: '🟣', industry: 'SaaS', headquarters: 'Chennai', description: 'Zoho offers a suite of online business, collaboration, and productivity tools.' },
  { slug: 'mindtree', name: 'Mindtree', logo: '🌳', industry: 'IT Services', headquarters: 'Bangalore', description: 'Mindtree is a global technology consulting and services company, now part of LTIMindtree.' },
  { slug: 'persistent-systems', name: 'Persistent Systems', logo: '🔷', industry: 'IT Services / Product', headquarters: 'Pune', description: 'Persistent Systems provides software product development and technology services.' },
  { slug: 'cognizant-india', name: 'Cognizant India', logo: '🔵', industry: 'IT Services', headquarters: 'Chennai', description: 'Cognizant is a leading professional services company transforming business through technology.' },
  { slug: 'accenture-india', name: 'Accenture India', logo: '▸', industry: 'Consulting / Technology', headquarters: 'Bangalore', description: 'Accenture is a global professional services company with extensive operations in India.' },
  { slug: 'goldman-sachs-india', name: 'Goldman Sachs India', logo: '🏦', industry: 'Finance', headquarters: 'Bangalore', description: 'Goldman Sachs has major technology and operations centers in Bangalore and Hyderabad.' },
  { slug: 'jp-morgan-india', name: 'JP Morgan India', logo: '🏛️', industry: 'Finance', headquarters: 'Mumbai', description: 'JP Morgan Chase has technology, operations, and asset management offices across India.' },
  { slug: 'morgan-stanley-india', name: 'Morgan Stanley India', logo: '📊', industry: 'Finance', headquarters: 'Mumbai', description: 'Morgan Stanley has technology and operations centers in Mumbai, Pune, and Chennai.' },
  { slug: 'uber-india', name: 'Uber India', logo: '🚗', industry: 'Transportation / Tech', headquarters: 'Hyderabad', description: 'Uber has major engineering and operations centers in Hyderabad and Bangalore.' },
  { slug: 'walmart-india', name: 'Walmart India', logo: '🏪', industry: 'Retail / Technology', headquarters: 'Bangalore', description: 'Walmart Global Tech India develops technology solutions for Walmart\'s global operations.' },
  { slug: 'atlassian-india', name: 'Atlassian India', logo: '🟦', industry: 'Collaboration / SaaS', headquarters: 'Bangalore', description: 'Atlassian has a major engineering center in Bangalore building tools like Jira and Confluence.' },
  { slug: 'salesforce-india', name: 'Salesforce India', logo: '☁️', industry: 'Cloud / CRM', headquarters: 'Hyderabad', description: 'Salesforce has offices in Hyderabad and Bangalore for CRM and cloud platform development.' },
  { slug: 'adobe-india', name: 'Adobe India', logo: '🎨', industry: 'Software / Creative', headquarters: 'Bangalore', description: 'Adobe India develops creative software, digital experience solutions, and document cloud products.' },
  { slug: 'nvidia-india', name: 'NVIDIA India', logo: '🟢', industry: 'Hardware / AI', headquarters: 'Hyderabad', description: 'NVIDIA India works on GPU computing, AI, and deep learning technologies.' },
  { slug: 'cisco-india', name: 'Cisco India', logo: '🌐', industry: 'Networking / Security', headquarters: 'Bangalore', description: 'Cisco India develops networking, security, and collaboration solutions.' },
  { slug: 'ibm-india', name: 'IBM India', logo: '🔵', industry: 'Enterprise Technology', headquarters: 'Bangalore', description: 'IBM India develops cloud, AI, and enterprise solutions for global markets.' },
  { slug: 'oracle-india', name: 'Oracle India', logo: '🔴', industry: 'Enterprise Software / Cloud', headquarters: 'Bangalore', description: 'Oracle India develops database, cloud, and enterprise software solutions.' },
  { slug: 'sap-india', name: 'SAP India', logo: '🟠', industry: 'Enterprise Software', headquarters: 'Bangalore', description: 'SAP India provides enterprise application software and cloud solutions.' },
  { slug: 'vmware-india', name: 'VMware India', logo: '🔷', industry: 'Cloud / Virtualization', headquarters: 'Bangalore', description: 'VMware India works on virtualization, cloud, and edge computing solutions.' },
  { slug: 'databricks-india', name: 'Databricks India', logo: '🔶', industry: 'Data / AI', headquarters: 'Bangalore', description: 'Databricks India provides unified analytics platform for data and AI.' },
  { slug: 'snowflake-india', name: 'Snowflake India', logo: '❄️', industry: 'Data / Cloud', headquarters: 'Bangalore', description: 'Snowflake India provides cloud-based data warehousing solutions.' },
  { slug: 'palantir-india', name: 'Palantir India', logo: '🔹', industry: 'Data Analytics', headquarters: 'Bangalore', description: 'Palantir India provides data analytics platforms for government and enterprise.' },
  { slug: 'crowdstrike-india', name: 'CrowdStrike India', logo: '🦅', industry: 'Cybersecurity', headquarters: 'Bangalore', description: 'CrowdStrike India provides cloud-delivered endpoint and cloud workload protection.' },
  { slug: 'mongodb-india', name: 'MongoDB India', logo: '🍃', industry: 'Database', headquarters: 'Bangalore', description: 'MongoDB India provides document database solutions and support.' },
  { slug: 'hashicorp-india', name: 'HashiCorp India', logo: '🟪', industry: 'Cloud Infrastructure', headquarters: 'Bangalore', description: 'HashiCorp India works on infrastructure automation tools like Terraform and Vault.' },
  { slug: 'elastic-india', name: 'Elastic India', logo: '🟡', industry: 'Search / Analytics', headquarters: 'Bangalore', description: 'Elastic India provides search, observability, and security solutions.' },
  { slug: 'servicenow-india', name: 'ServiceNow India', logo: '🔵', industry: 'Enterprise Software', headquarters: 'Hyderabad', description: 'ServiceNow India develops cloud-based workflow automation platforms.' },
  { slug: 'workday-india', name: 'Workday India', logo: '🟦', industry: 'Enterprise Software / HCM', headquarters: 'Hyderabad', description: 'Workday India develops enterprise cloud applications for finance and HR.' },
  { slug: 'linkedin-india', name: 'LinkedIn India', logo: '💼', industry: 'Professional Networking', headquarters: 'Bangalore', description: 'LinkedIn India has major engineering and product teams in Bangalore.' },
  { slug: 'bytedance-india', name: 'ByteDance India', logo: '📱', industry: 'Social Media / AI', headquarters: 'Bangalore', description: 'ByteDance has engineering centers in Bangalore working on content recommendation and AI.' },
  { slug: 'snap-india', name: 'Snap India', logo: '📸', industry: 'Social Media / AR', headquarters: 'Mumbai', description: 'Snap Inc. has engineering and business teams in India for Snapchat.' },
  { slug: 'spotify-india', name: 'Spotify India', logo: '🎵', industry: 'Music / Streaming', headquarters: 'Mumbai', description: 'Spotify India manages content, marketing, and engineering for the Indian market.' },
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
