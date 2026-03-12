export interface NewsArticle {
  id: string
  title: string
  description: string
  content: string
  category: string
  author: string
  date: Date
  image: string
  readTime: number
  featured?: boolean
  breaking?: boolean
  trending?: boolean
  views: number
}

export const categories = [
  "Business",
  "Technology",
  "Sports",
  "Entertainment",
  "Science",
  "Health",
]

export const mockArticles: NewsArticle[] = [
  {
    id: "1",
    title: "Revolutionary AI Breakthrough Transforms Healthcare Industry",
    description: "Scientists announce major breakthrough in artificial intelligence that could revolutionize medical diagnostics",
    content: "A team of international researchers has announced a groundbreaking advancement in AI technology that promises to revolutionize the healthcare industry. The new system can analyze medical images with 99.8% accuracy, surpassing human radiologists. This breakthrough is expected to save millions of lives annually and reduce healthcare costs significantly. The technology was developed over 5 years of intensive research and testing across 50 major hospitals worldwide.",
    category: "Technology",
    author: "Sarah Chen",
    date: new Date(Date.now() - 2 * 60 * 60 * 1000),
    image: "https://images.unsplash.com/photo-1576091160550-112173f7f869?w=800&h=400&fit=crop",
    readTime: 5,
    breaking: true,
    views: 45230,
  },
  {
    id: "2",
    title: "Global Markets Rally on Positive Economic Data",
    description: "Stock indices surge as new employment figures exceed expectations worldwide",
    content: "Global financial markets experienced a significant rally today following the release of stronger-than-expected employment data. The S&P 500 climbed 2.3%, while European and Asian markets also showed strong gains. Economists attribute the positive sentiment to renewed confidence in economic recovery. Key sectors including technology and finance led the gains, with a particular surge in renewable energy stocks.",
    category: "Business",
    author: "Michael Rodriguez",
    date: new Date(Date.now() - 4 * 60 * 60 * 1000),
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=400&fit=crop",
    readTime: 4,
    trending: true,
    views: 32150,
  },
  {
    id: "3",
    title: "Champion Athlete Breaks 20-Year World Record",
    description: "Olympic star shatters previously untouched world record in stunning performance",
    content: "In an electrifying display of athletic excellence, world-class competitor shattered a 20-year-old world record today. The achievement came during an international championship event attended by thousands of spectators. The athlete's performance exceeded previous records by a significant margin, demonstrating years of dedicated training and innovation in sports science. This victory marks a historic moment in the sport and is expected to inspire a new generation of athletes.",
    category: "Sports",
    author: "James Williams",
    date: new Date(Date.now() - 6 * 60 * 60 * 1000),
    image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=400&fit=crop",
    readTime: 3,
    featured: true,
    views: 56890,
  },
  {
    id: "4",
    title: "New Medical Treatment Shows Promise for Chronic Diseases",
    description: "Clinical trials reveal promising results for innovative treatment approach",
    content: "Researchers announced positive results from phase 3 clinical trials of a new treatment for chronic diseases. The treatment demonstrates an 87% success rate in preliminary trials, with minimal side effects reported. The pharmaceutical company expects to seek regulatory approval within the next 18 months. If approved, the treatment could benefit millions of patients worldwide and represent a major advancement in modern medicine.",
    category: "Health",
    author: "Dr. Emily Watson",
    date: new Date(Date.now() - 8 * 60 * 60 * 1000),
    image: "https://images.unsplash.com/photo-1576091160643-112d04d3f1c9?w=800&h=400&fit=crop",
    readTime: 6,
    trending: true,
    views: 28745,
  },
  {
    id: "5",
    title: "Blockbuster Film Breaks Box Office Records",
    description: "Latest superhero release shatters opening weekend expectations",
    content: "A major film studio's latest superhero blockbuster has shattered box office records with an unprecedented opening weekend. The film earned $285 million globally, surpassing previous records and becoming the highest-grossing opening of all time. Critics praised the film's storytelling, visual effects, and performances. The success signals strong audience appetite for quality entertainment and suggests continued dominance of the superhero genre.",
    category: "Entertainment",
    author: "Lisa Anderson",
    date: new Date(Date.now() - 12 * 60 * 60 * 1000),
    image: "https://images.unsplash.com/photo-1533109752211-118fcfe5e43e?w=800&h=400&fit=crop",
    readTime: 4,
    featured: true,
    views: 67234,
  },
  {
    id: "6",
    title: "Scientists Discover New Species in Remote Amazon Region",
    description: "Expedition uncovers previously unknown species, expanding biodiversity knowledge",
    content: "An international research expedition has discovered 14 previously unknown species in the remote Amazon rainforest. The discovery includes new species of plants, insects, and small mammals. Scientists believe the findings represent only a fraction of undiscovered biodiversity in the region. The discoveries highlight the importance of protecting rainforests and continuing biodiversity research in unexplored areas.",
    category: "Science",
    author: "Dr. Marcus Thompson",
    date: new Date(Date.now() - 24 * 60 * 60 * 1000),
    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=400&fit=crop",
    readTime: 5,
    views: 19234,
  },
  {
    id: "7",
    title: "Tech Giant Launches Revolutionary Product Line",
    description: "Company announces new devices featuring cutting-edge technology",
    content: "A leading technology company unveiled its most ambitious product line to date, featuring revolutionary advancements in artificial intelligence and quantum computing. The new devices promise to redefine user experience and set new industry standards. Pre-orders have already exceeded expectations, with millions of units reserved. Industry analysts predict this launch will influence product development across the entire technology sector.",
    category: "Technology",
    author: "David Park",
    date: new Date(Date.now() - 18 * 60 * 60 * 1000),
    image: "https://images.unsplash.com/photo-1552820728-8ac41f1b4dbb?w=800&h=400&fit=crop",
    readTime: 5,
    trending: true,
    views: 74560,
  },
  {
    id: "8",
    title: "Championship Team Crowned After Thrilling Final",
    description: "Historic victory in sports championship concluded with unexpected twist",
    content: "In a thrilling conclusion to the championship series, the underdog team emerged victorious after an intense final match. The winning goal came in the final moments of the game, sending fans into raptures. The team's journey from lower rankings to championship victory has captured the imagination of sports fans worldwide. The victory has been hailed as one of the greatest sports moments of the decade.",
    category: "Sports",
    author: "Robert Martinez",
    date: new Date(Date.now() - 3 * 60 * 60 * 1000),
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=400&fit=crop",
    readTime: 3,
    featured: true,
    views: 89123,
  },
  {
    id: "9",
    title: "Major Entertainment Event Announced for 2025",
    description: "Prestigious award ceremony lineup features unprecedented star power",
    content: "Organizers announced the complete lineup for the year's most prestigious entertainment award ceremony. The event will feature performances from world-renowned artists and honor outstanding achievements in film, music, and television. This year's ceremony promises to be the most glamorous and star-studded event in the calendar. Tickets sold out in record time, with fans from around the globe competing for entry.",
    category: "Entertainment",
    author: "Victoria Foster",
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    image: "https://images.unsplash.com/photo-1489599849228-beds423e3c5c?w=800&h=400&fit=crop",
    readTime: 4,
    views: 42156,
  },
  {
    id: "10",
    title: "Healthcare Innovation Wins International Award",
    description: "New medical technology recognized for transforming patient care",
    content: "A groundbreaking medical device developed by an international research team has won the prestigious Global Healthcare Innovation Award. The device simplifies complex medical procedures and improves patient outcomes significantly. Recognition from the award demonstrates the technology's potential to revolutionize treatment approaches worldwide. The winning team plans to expand production and distribution to reach patients in underserved regions.",
    category: "Health",
    author: "Dr. Jennifer Lee",
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=400&fit=crop",
    readTime: 5,
    views: 31245,
  },
  {
    id: "11",
    title: "Economic Growth Accelerates Globally",
    description: "International economies show strongest growth in years",
    content: "Global economic data reveals acceleration in growth rates across major economies. Inflation concerns ease as markets stabilize, encouraging positive investor sentiment. The World Economic Forum predicts continued strength through the end of the year. Major developed economies report strong employment figures and consumer confidence. Investment in green energy and technology sectors drives much of the growth.",
    category: "Business",
    author: "Thomas Bennett",
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    image: "https://images.unsplash.com/photo-1460925895917-adf4e565db1d?w=800&h=400&fit=crop",
    readTime: 4,
    views: 25678,
  },
  {
    id: "12",
    title: "Quantum Computing Reaches New Milestone",
    description: "Breakthrough in quantum computing promises transformative applications",
    content: "Scientists have achieved a significant milestone in quantum computing, demonstrating practical applications for real-world problems. The advancement brings quantum technology closer to mainstream adoption. Major tech companies are competing to develop quantum solutions for finance, medicine, and climate modeling. Experts believe quantum computing will revolutionize industries within the next decade.",
    category: "Technology",
    author: "Dr. Susan O'Brien",
    date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    image: "https://images.unsplash.com/photo-1639762681057-408ba8a5fd13?w=800&h=400&fit=crop",
    readTime: 6,
    views: 38945,
  },
]

export function getAllArticles(): NewsArticle[] {
  return mockArticles.sort((a, b) => b.date.getTime() - a.date.getTime())
}

export function getArticlesByCategory(category: string): NewsArticle[] {
  return mockArticles
    .filter((article) => article.category === category)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
}

export function getArticleById(id: string): NewsArticle | undefined {
  return mockArticles.find((article) => article.id === id)
}

export function getFeaturedArticles(): NewsArticle[] {
  return mockArticles
    .filter((article) => article.featured)
    .sort((a, b) => b.views - a.views)
    .slice(0, 3)
}

export function getBreakingNews(): NewsArticle[] {
  return mockArticles
    .filter((article) => article.breaking)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 3)
}

export function getTrendingArticles(): NewsArticle[] {
  return mockArticles
    .filter((article) => article.trending)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
}

export function searchArticles(query: string): NewsArticle[] {
  const lowerQuery = query.toLowerCase()
  return mockArticles
    .filter(
      (article) =>
        article.title.toLowerCase().includes(lowerQuery) ||
        article.description.toLowerCase().includes(lowerQuery) ||
        article.content.toLowerCase().includes(lowerQuery)
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime())
}
