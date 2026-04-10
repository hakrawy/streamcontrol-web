export interface Movie {
  id: string;
  type: 'movie';
  title: string;
  description: string;
  poster: string;
  backdrop: string;
  genre: string[];
  year: number;
  duration: string;
  rating: number;
  cast: string[];
  director: string;
  quality: string[];
  isFeatured?: boolean;
  isTrending?: boolean;
  isNew?: boolean;
  isExclusive?: boolean;
  trailerUrl?: string;
  streamUrl?: string;
  subtitles?: { language: string; url: string }[];
}

export interface Series {
  id: string;
  type: 'series';
  title: string;
  description: string;
  poster: string;
  backdrop: string;
  genre: string[];
  year: number;
  rating: number;
  cast: string[];
  creator: string;
  seasons: Season[];
  isFeatured?: boolean;
  isTrending?: boolean;
  isNew?: boolean;
  totalEpisodes: number;
}

export interface Season {
  id: string;
  number: number;
  title: string;
  episodes: Episode[];
}

export interface Episode {
  id: string;
  number: number;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  streamUrl?: string;
}

export interface LiveChannel {
  id: string;
  name: string;
  logo: string;
  category: string;
  streamUrl: string;
  isLive: boolean;
  isFeatured?: boolean;
  viewers: number;
  currentProgram?: string;
  nextProgram?: string;
}

export interface WatchRoom {
  id: string;
  name: string;
  hostName: string;
  hostAvatar: string;
  contentId: string;
  contentTitle: string;
  contentPoster: string;
  contentType: 'movie' | 'series' | 'live';
  participants: number;
  maxParticipants: number;
  privacy: 'public' | 'private' | 'invite_only';
  isActive: boolean;
  roomCode: string;
  createdAt: string;
}

export interface ContinueWatching {
  id: string;
  contentId: string;
  title: string;
  poster: string;
  episodeInfo?: string;
  progress: number;
  duration: string;
  type: 'movie' | 'series';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  memberSince: string;
  plan: string;
  watchlistCount: number;
  watchedCount: number;
}

// ===== MOCK MOVIES =====
export const movies: Movie[] = [
  {
    id: 'movie-1',
    type: 'movie',
    title: 'Neon Horizon',
    description: 'In a world where artificial intelligence has surpassed human capability, a lone detective must navigate the neon-lit streets of Neo Tokyo to uncover a conspiracy that threatens the fabric of reality itself.',
    poster: 'https://images.unsplash.com/photo-1534809027769-b00d750a6bac?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=450&fit=crop',
    genre: ['Sci-Fi', 'Thriller'],
    year: 2024,
    duration: '2h 18m',
    rating: 8.7,
    cast: ['Alex Rivera', 'Yuki Tanaka', 'Marcus Chen', 'Elena Volkov'],
    director: 'James Cameron II',
    quality: ['4K', '1080p', '720p'],
    isFeatured: true,
    isTrending: true,
    isExclusive: true,
  },
  {
    id: 'movie-2',
    type: 'movie',
    title: 'The Last Frontier',
    description: 'A group of astronauts embark on humanity\'s most ambitious mission — to colonize a distant exoplanet. But what they find there will change everything we know about life in the universe.',
    poster: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&h=450&fit=crop',
    genre: ['Sci-Fi', 'Drama'],
    year: 2024,
    duration: '2h 42m',
    rating: 9.1,
    cast: ['Sarah Mitchell', 'David Park', 'Omar Hassan'],
    director: 'Aria Stone',
    quality: ['4K', '1080p', '720p', '480p'],
    isFeatured: true,
    isTrending: true,
  },
  {
    id: 'movie-3',
    type: 'movie',
    title: 'Whispers in the Dark',
    description: 'When a family moves into a centuries-old mansion, their youngest child begins communicating with entities that reveal the house\'s terrifying past.',
    poster: 'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800&h=450&fit=crop',
    genre: ['Horror', 'Thriller'],
    year: 2024,
    duration: '1h 54m',
    rating: 7.8,
    cast: ['Emily Clarke', 'Robert Dawson', 'Lily Chen'],
    director: 'Marco Rossi',
    quality: ['1080p', '720p'],
    isNew: true,
  },
  {
    id: 'movie-4',
    type: 'movie',
    title: 'Ocean\'s Rhythm',
    description: 'A professional surfer who lost everything finds redemption and love on the shores of a remote Pacific island, mentoring local kids to compete internationally.',
    poster: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=450&fit=crop',
    genre: ['Drama', 'Romance'],
    year: 2023,
    duration: '2h 05m',
    rating: 8.2,
    cast: ['Chris Hemsworth Jr.', 'Moana Teari', 'Jake Williams'],
    director: 'Lena Yang',
    quality: ['4K', '1080p', '720p'],
  },
  {
    id: 'movie-5',
    type: 'movie',
    title: 'Code Red',
    description: 'An elite cybersecurity team races against time to stop a global attack that could shut down every connected device on Earth. Trust no one.',
    poster: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=450&fit=crop',
    genre: ['Action', 'Thriller'],
    year: 2024,
    duration: '2h 11m',
    rating: 8.5,
    cast: ['Idris Elba Jr.', 'Zendaya Rose', 'Tom Liu'],
    director: 'Rachel Kim',
    quality: ['4K', '1080p', '720p'],
    isTrending: true,
  },
  {
    id: 'movie-6',
    type: 'movie',
    title: 'The Art of Silence',
    description: 'A deaf pianist discovers she can hear music through vibrations and embarks on a journey to perform at the world\'s most prestigious concert hall.',
    poster: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=450&fit=crop',
    genre: ['Drama', 'Romance'],
    year: 2024,
    duration: '2h 22m',
    rating: 9.3,
    cast: ['Scarlett Rain', 'Antonio Morales', 'Wei Zhang'],
    director: 'Sofia Laurent',
    quality: ['4K', '1080p', '720p'],
    isExclusive: true,
    isNew: true,
  },
  {
    id: 'movie-7',
    type: 'movie',
    title: 'Savage Lands',
    description: 'In a post-apocalyptic world, rival clans fight for control of the last fertile valley on Earth. One warrior must unite enemies to survive.',
    poster: 'https://images.unsplash.com/photo-1440581572325-0bea30075d9d?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=450&fit=crop',
    genre: ['Action', 'Fantasy'],
    year: 2023,
    duration: '2h 35m',
    rating: 7.9,
    cast: ['Dwayne Rock Jr.', 'Priya Sharma', 'Lucas Brown'],
    director: 'Viktor Petrov',
    quality: ['1080p', '720p', '480p'],
    isTrending: true,
  },
  {
    id: 'movie-8',
    type: 'movie',
    title: 'Midnight Express',
    description: 'A journalist investigating a drug cartel in South America finds herself in a web of corruption that reaches the highest levels of government.',
    poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1533628635777-112b2239b1c7?w=800&h=450&fit=crop',
    genre: ['Thriller', 'Drama'],
    year: 2024,
    duration: '2h 08m',
    rating: 8.4,
    cast: ['Ana Rodriguez', 'Michael Torres', 'Samuel Lee'],
    director: 'Carlos Mendez',
    quality: ['4K', '1080p', '720p'],
  },
  {
    id: 'movie-9',
    type: 'movie',
    title: 'Frozen Hearts',
    description: 'Two rival ice climbers must work together to survive a deadly blizzard on K2, discovering that their shared past holds secrets neither expected.',
    poster: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&h=450&fit=crop',
    genre: ['Action', 'Drama'],
    year: 2023,
    duration: '1h 58m',
    rating: 8.0,
    cast: ['Oscar Nilsson', 'Hannah Storm', 'Raj Patel'],
    director: 'Anna Bergström',
    quality: ['4K', '1080p'],
  },
  {
    id: 'movie-10',
    type: 'movie',
    title: 'Digital Dreams',
    description: 'A teenager discovers she can enter and manipulate the dream world through a mysterious app, but nightmares from other users begin leaking into reality.',
    poster: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=450&fit=crop',
    genre: ['Sci-Fi', 'Fantasy'],
    year: 2024,
    duration: '2h 01m',
    rating: 8.6,
    cast: ['Maya Johnson', 'Tyler Kim', 'Dr. Sarah Wells'],
    director: 'Neo Zhang',
    quality: ['4K', '1080p', '720p'],
    isNew: true,
    isTrending: true,
  },
  {
    id: 'movie-11',
    type: 'movie',
    title: 'The Grand Heist',
    description: 'Five strangers are recruited for the most audacious museum heist ever attempted — stealing the Mona Lisa during the Louvre\'s 250th anniversary gala.',
    poster: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&h=450&fit=crop',
    genre: ['Action', 'Comedy'],
    year: 2024,
    duration: '2h 14m',
    rating: 8.1,
    cast: ['Ryan Brooks', 'Sophie Duval', 'Hassan Ali'],
    director: 'Jean-Pierre Blanc',
    quality: ['1080p', '720p'],
  },
  {
    id: 'movie-12',
    type: 'movie',
    title: 'Echoes of Tomorrow',
    description: 'A quantum physicist accidentally creates a portal to parallel universes and must navigate infinite realities to find her way back to her own timeline.',
    poster: 'https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&h=450&fit=crop',
    genre: ['Sci-Fi', 'Thriller'],
    year: 2024,
    duration: '2h 28m',
    rating: 8.9,
    cast: ['Natalie Porter', 'James Okafor', 'Lin Wei'],
    director: 'Christopher Nolan Jr.',
    quality: ['4K', '1080p', '720p'],
    isExclusive: true,
  },
];

// ===== MOCK SERIES =====
export const series: Series[] = [
  {
    id: 'series-1',
    type: 'series',
    title: 'Shadow Protocol',
    description: 'A covert intelligence unit discovers a global conspiracy that blurs the line between ally and enemy. Each mission brings them closer to the truth — and further from safety.',
    poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800&h=450&fit=crop',
    genre: ['Action', 'Thriller'],
    year: 2024,
    rating: 9.0,
    cast: ['Jason Moore', 'Elena Petrova', 'Daniel Okafor'],
    creator: 'David Lynch Jr.',
    totalEpisodes: 16,
    isFeatured: true,
    isTrending: true,
    seasons: [
      {
        id: 'sp-s1', number: 1, title: 'Season 1 - Genesis',
        episodes: [
          { id: 'sp-s1e1', number: 1, title: 'The Recruit', description: 'A former CIA analyst is pulled back into the world of espionage.', thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=225&fit=crop', duration: '52m' },
          { id: 'sp-s1e2', number: 2, title: 'Dead Drop', description: 'The team discovers a mole within their ranks.', thumbnail: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=225&fit=crop', duration: '48m' },
          { id: 'sp-s1e3', number: 3, title: 'Blackout', description: 'A power grid attack forces the team to go dark.', thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=225&fit=crop', duration: '55m' },
          { id: 'sp-s1e4', number: 4, title: 'Extraction', description: 'A high-stakes rescue mission in hostile territory.', thumbnail: 'https://images.unsplash.com/photo-1534809027769-b00d750a6bac?w=400&h=225&fit=crop', duration: '50m' },
          { id: 'sp-s1e5', number: 5, title: 'The Handler', description: 'Elena goes undercover at a weapons auction.', thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=225&fit=crop', duration: '47m' },
          { id: 'sp-s1e6', number: 6, title: 'Fallout', description: 'Loyalties are tested as the conspiracy deepens.', thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=225&fit=crop', duration: '58m' },
          { id: 'sp-s1e7', number: 7, title: 'Protocol Zero', description: 'The team faces their most dangerous mission yet.', thumbnail: 'https://images.unsplash.com/photo-1533628635777-112b2239b1c7?w=400&h=225&fit=crop', duration: '54m' },
          { id: 'sp-s1e8', number: 8, title: 'Endgame', description: 'Season finale — the mastermind is revealed.', thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=225&fit=crop', duration: '62m' },
        ],
      },
      {
        id: 'sp-s2', number: 2, title: 'Season 2 - Reckoning',
        episodes: [
          { id: 'sp-s2e1', number: 1, title: 'New Order', description: 'Six months later, a new threat emerges.', thumbnail: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=400&h=225&fit=crop', duration: '51m' },
          { id: 'sp-s2e2', number: 2, title: 'Ghost Ship', description: 'An abandoned vessel holds classified secrets.', thumbnail: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&h=225&fit=crop', duration: '49m' },
          { id: 'sp-s2e3', number: 3, title: 'Double Agent', description: 'Nothing is what it seems when trust is weaponized.', thumbnail: 'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=400&h=225&fit=crop', duration: '53m' },
          { id: 'sp-s2e4', number: 4, title: 'Siege', description: 'The headquarters comes under direct attack.', thumbnail: 'https://images.unsplash.com/photo-1440581572325-0bea30075d9d?w=400&h=225&fit=crop', duration: '56m' },
          { id: 'sp-s2e5', number: 5, title: 'Into the Fire', description: 'Jason must make an impossible choice.', thumbnail: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=225&fit=crop', duration: '48m' },
          { id: 'sp-s2e6', number: 6, title: 'The Architect', description: 'The true scope of the conspiracy is revealed.', thumbnail: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=225&fit=crop', duration: '55m' },
          { id: 'sp-s2e7', number: 7, title: 'Scorched Earth', description: 'With nothing left to lose, the team goes all in.', thumbnail: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&h=225&fit=crop', duration: '52m' },
          { id: 'sp-s2e8', number: 8, title: 'Shadow Fall', description: 'The season finale that changes everything.', thumbnail: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=400&h=225&fit=crop', duration: '65m' },
        ],
      },
    ],
  },
  {
    id: 'series-2',
    type: 'series',
    title: 'The Crown of Embers',
    description: 'In a mythical land where magic has been outlawed, a young blacksmith discovers she holds the power to reignite the ancient flames — and reshape the kingdom.',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=450&fit=crop',
    genre: ['Fantasy', 'Drama'],
    year: 2024,
    rating: 8.8,
    cast: ['Aria Blackwood', 'Theo Sterling', 'Dame Victoria'],
    creator: 'Sarah Waters',
    totalEpisodes: 10,
    isTrending: true,
    isNew: true,
    seasons: [
      {
        id: 'ce-s1', number: 1, title: 'Season 1 - The Awakening',
        episodes: [
          { id: 'ce-s1e1', number: 1, title: 'The Forge', description: 'A mysterious stranger visits the village.', thumbnail: 'https://images.unsplash.com/photo-1440581572325-0bea30075d9d?w=400&h=225&fit=crop', duration: '58m' },
          { id: 'ce-s1e2', number: 2, title: 'First Flame', description: 'Kira discovers her hidden power.', thumbnail: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=225&fit=crop', duration: '52m' },
          { id: 'ce-s1e3', number: 3, title: 'The Old Ways', description: 'Journey to the forbidden library.', thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=225&fit=crop', duration: '55m' },
          { id: 'ce-s1e4', number: 4, title: 'Blood Oath', description: 'An alliance is forged in secret.', thumbnail: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=225&fit=crop', duration: '50m' },
          { id: 'ce-s1e5', number: 5, title: 'The Siege', description: 'The kingdom strikes back.', thumbnail: 'https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=400&h=225&fit=crop', duration: '60m' },
        ],
      },
    ],
  },
  {
    id: 'series-3',
    type: 'series',
    title: 'Silicon Valley Dreams',
    description: 'The untold story of four college dropouts who built the world\'s most influential tech company, and the personal sacrifices behind their billion-dollar empire.',
    poster: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=450&fit=crop',
    genre: ['Drama', 'Thriller'],
    year: 2023,
    rating: 8.5,
    cast: ['Kevin Park', 'Amy Walsh', 'Raj Kumar', 'Lisa Montenegro'],
    creator: 'Aaron Sorkin Jr.',
    totalEpisodes: 10,
    seasons: [
      {
        id: 'svd-s1', number: 1, title: 'Season 1 - The Garage',
        episodes: [
          { id: 'svd-s1e1', number: 1, title: 'Hello World', description: 'Four friends code their first prototype.', thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=225&fit=crop', duration: '45m' },
          { id: 'svd-s1e2', number: 2, title: 'Seed Round', description: 'The first investor meeting changes everything.', thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=225&fit=crop', duration: '47m' },
          { id: 'svd-s1e3', number: 3, title: 'Pivot', description: 'When the original idea fails, they must adapt.', thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=225&fit=crop', duration: '44m' },
          { id: 'svd-s1e4', number: 4, title: 'Series A', description: 'Big money comes with big strings attached.', thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=225&fit=crop', duration: '50m' },
          { id: 'svd-s1e5', number: 5, title: 'IPO', description: 'The moment of truth arrives.', thumbnail: 'https://images.unsplash.com/photo-1533628635777-112b2239b1c7?w=400&h=225&fit=crop', duration: '55m' },
        ],
      },
    ],
  },
  {
    id: 'series-4',
    type: 'series',
    title: 'Deep Blue',
    description: 'A marine biologist uncovers an intelligent underwater civilization that has been monitoring humanity for centuries. First contact was never supposed to happen.',
    poster: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=450&fit=crop',
    genre: ['Sci-Fi', 'Drama'],
    year: 2024,
    rating: 8.9,
    cast: ['Marina Costa', 'Dr. Jin Nakamura', 'Captain Alex Reed'],
    creator: 'James Cameron III',
    totalEpisodes: 8,
    isNew: true,
    isFeatured: true,
    seasons: [
      {
        id: 'db-s1', number: 1, title: 'Season 1 - First Dive',
        episodes: [
          { id: 'db-s1e1', number: 1, title: 'The Signal', description: 'A mysterious sonar pattern leads to discovery.', thumbnail: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&h=225&fit=crop', duration: '58m' },
          { id: 'db-s1e2', number: 2, title: 'Descent', description: 'The team dives to record-breaking depths.', thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=225&fit=crop', duration: '52m' },
          { id: 'db-s1e3', number: 3, title: 'Contact', description: 'First contact with the underwater beings.', thumbnail: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&h=225&fit=crop', duration: '55m' },
          { id: 'db-s1e4', number: 4, title: 'Pressure', description: 'Governments react to the discovery.', thumbnail: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=225&fit=crop', duration: '50m' },
        ],
      },
    ],
  },
  {
    id: 'series-5',
    type: 'series',
    title: 'Midnight Diner',
    description: 'A mysterious diner that opens only between midnight and dawn, where each customer\'s order reveals their deepest story. Anthology series with interconnected tales.',
    poster: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=450&fit=crop',
    genre: ['Drama', 'Romance'],
    year: 2023,
    rating: 8.7,
    cast: ['Master Chef Kenji', 'Various Guests'],
    creator: 'Yoko Ando',
    totalEpisodes: 12,
    isTrending: true,
    seasons: [
      {
        id: 'md-s1', number: 1, title: 'Season 1',
        episodes: [
          { id: 'md-s1e1', number: 1, title: 'Ramen', description: 'A businessman eats ramen alone every night.', thumbnail: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=225&fit=crop', duration: '35m' },
          { id: 'md-s1e2', number: 2, title: 'Egg Sandwich', description: 'A young couple\'s last meal together.', thumbnail: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=225&fit=crop', duration: '32m' },
          { id: 'md-s1e3', number: 3, title: 'Green Tea', description: 'An elderly woman visits with a secret.', thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=225&fit=crop', duration: '38m' },
          { id: 'md-s1e4', number: 4, title: 'Curry Rice', description: 'A chef returns home after decades abroad.', thumbnail: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=225&fit=crop', duration: '40m' },
          { id: 'md-s1e5', number: 5, title: 'Black Coffee', description: 'A detective seeks answers over coffee.', thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=225&fit=crop', duration: '36m' },
          { id: 'md-s1e6', number: 6, title: 'Hot Sake', description: 'Two strangers bond over warm sake.', thumbnail: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&h=225&fit=crop', duration: '34m' },
        ],
      },
    ],
  },
  {
    id: 'series-6',
    type: 'series',
    title: 'Quantum Minds',
    description: 'A team of neuroscientists develops technology that can link human consciousness, but the line between minds begins to blur dangerously.',
    poster: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=450&fit=crop',
    genre: ['Sci-Fi', 'Thriller'],
    year: 2024,
    rating: 8.3,
    cast: ['Dr. Maya Lin', 'Professor Okafor', 'Agent Torres'],
    creator: 'The Wachowskis Jr.',
    totalEpisodes: 8,
    isNew: true,
    seasons: [
      {
        id: 'qm-s1', number: 1, title: 'Season 1 - Connection',
        episodes: [
          { id: 'qm-s1e1', number: 1, title: 'Neural Link', description: 'The first successful consciousness transfer.', thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=225&fit=crop', duration: '50m' },
          { id: 'qm-s1e2', number: 2, title: 'Echo', description: 'Side effects begin to manifest.', thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=225&fit=crop', duration: '48m' },
          { id: 'qm-s1e3', number: 3, title: 'Merge', description: 'Two minds become dangerously intertwined.', thumbnail: 'https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=400&h=225&fit=crop', duration: '52m' },
          { id: 'qm-s1e4', number: 4, title: 'Fracture', description: 'The technology falls into the wrong hands.', thumbnail: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=225&fit=crop', duration: '55m' },
        ],
      },
    ],
  },
];

// ===== MOCK LIVE CHANNELS =====
export const liveChannels: LiveChannel[] = [
  { id: 'ch-1', name: 'Stream News 24', logo: 'https://images.unsplash.com/photo-1504711434969-e33886168d8c?w=120&h=120&fit=crop', category: 'news', streamUrl: '', isLive: true, isFeatured: true, viewers: 12540, currentProgram: 'Breaking News Live', nextProgram: 'World Report' },
  { id: 'ch-2', name: 'Sports Central', logo: 'https://images.unsplash.com/photo-1461896836934-ber91080df02?w=120&h=120&fit=crop', category: 'sports', streamUrl: '', isLive: true, isFeatured: true, viewers: 45200, currentProgram: 'Premier League: Live Match', nextProgram: 'Post-Match Analysis' },
  { id: 'ch-3', name: 'Cinema Gold', logo: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=120&h=120&fit=crop', category: 'movies', streamUrl: '', isLive: true, viewers: 8930, currentProgram: 'Classic Movie Marathon', nextProgram: 'Director\'s Cut Special' },
  { id: 'ch-4', name: 'Kids World', logo: 'https://images.unsplash.com/photo-1566694271453-390536dd1f0d?w=120&h=120&fit=crop', category: 'kids', streamUrl: '', isLive: true, viewers: 15670, currentProgram: 'Cartoon Adventures', nextProgram: 'Storytime' },
  { id: 'ch-5', name: 'Melody FM', logo: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=120&h=120&fit=crop', category: 'music', streamUrl: '', isLive: true, isFeatured: true, viewers: 22100, currentProgram: 'Top 40 Countdown', nextProgram: 'Acoustic Sessions' },
  { id: 'ch-6', name: 'Discovery World', logo: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=120&h=120&fit=crop', category: 'documentary', streamUrl: '', isLive: true, viewers: 7840, currentProgram: 'Ocean Mysteries', nextProgram: 'Wild Africa' },
  { id: 'ch-7', name: 'Global News', logo: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=120&h=120&fit=crop', category: 'news', streamUrl: '', isLive: true, viewers: 9200, currentProgram: 'Evening Bulletin', nextProgram: 'Weather Update' },
  { id: 'ch-8', name: 'Fun Zone', logo: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=120&h=120&fit=crop', category: 'entertainment', streamUrl: '', isLive: true, viewers: 18400, currentProgram: 'Late Night Comedy', nextProgram: 'Game Show Live' },
  { id: 'ch-9', name: 'ESPN Live', logo: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=120&h=120&fit=crop', category: 'sports', streamUrl: '', isLive: true, viewers: 67800, currentProgram: 'NBA Playoffs Live', nextProgram: 'SportsCenter' },
  { id: 'ch-10', name: 'Nature HD', logo: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=120&h=120&fit=crop', category: 'documentary', streamUrl: '', isLive: true, viewers: 5600, currentProgram: 'Planet Earth Special', nextProgram: 'Rainforest Documentary' },
  { id: 'ch-11', name: 'Toons TV', logo: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=120&h=120&fit=crop', category: 'kids', streamUrl: '', isLive: true, viewers: 11200, currentProgram: 'Morning Cartoons', nextProgram: 'Art & Craft Show' },
  { id: 'ch-12', name: 'Rock Radio', logo: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=120&h=120&fit=crop', category: 'music', streamUrl: '', isLive: false, viewers: 0, currentProgram: 'Off Air', nextProgram: 'Rock Classics at 8PM' },
];

// ===== MOCK WATCH ROOMS =====
export const watchRooms: WatchRoom[] = [
  { id: 'room-1', name: 'Neon Horizon Watch Party', hostName: 'Alex_Streams', hostAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop', contentId: 'movie-1', contentTitle: 'Neon Horizon', contentPoster: 'https://images.unsplash.com/photo-1534809027769-b00d750a6bac?w=400&h=600&fit=crop', contentType: 'movie', participants: 24, maxParticipants: 50, privacy: 'public', isActive: true, roomCode: 'NEON24', createdAt: '2024-01-15T20:00:00Z' },
  { id: 'room-2', name: 'Shadow Protocol Binge', hostName: 'SeriesLover', hostAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop', contentId: 'series-1', contentTitle: 'Shadow Protocol S2E1', contentPoster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop', contentType: 'series', participants: 12, maxParticipants: 30, privacy: 'public', isActive: true, roomCode: 'SHAD12', createdAt: '2024-01-15T19:30:00Z' },
  { id: 'room-3', name: 'Sports Night Live', hostName: 'SportsFan99', hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop', contentId: 'ch-9', contentTitle: 'ESPN Live - NBA Playoffs', contentPoster: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=600&fit=crop', contentType: 'live', participants: 156, maxParticipants: 200, privacy: 'public', isActive: true, roomCode: 'SPRT99', createdAt: '2024-01-15T21:00:00Z' },
  { id: 'room-4', name: 'Deep Blue Premiere', hostName: 'SciFiClub', hostAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop', contentId: 'series-4', contentTitle: 'Deep Blue S1E1', contentPoster: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&h=600&fit=crop', contentType: 'series', participants: 45, maxParticipants: 100, privacy: 'public', isActive: true, roomCode: 'DEEP01', createdAt: '2024-01-15T20:30:00Z' },
  { id: 'room-5', name: 'Friday Movie Night', hostName: 'MovieBuff', hostAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop', contentId: 'movie-6', contentTitle: 'The Art of Silence', contentPoster: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=600&fit=crop', contentType: 'movie', participants: 8, maxParticipants: 20, privacy: 'invite_only', isActive: true, roomCode: 'FMN08', createdAt: '2024-01-15T21:30:00Z' },
];

// ===== CONTINUE WATCHING =====
export const continueWatching: ContinueWatching[] = [
  { id: 'cw-1', contentId: 'series-1', title: 'Shadow Protocol', poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop', episodeInfo: 'S2 E3 · Double Agent', progress: 0.45, duration: '53m', type: 'series' },
  { id: 'cw-2', contentId: 'movie-4', title: 'Ocean\'s Rhythm', poster: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&h=600&fit=crop', progress: 0.72, duration: '2h 05m', type: 'movie' },
  { id: 'cw-3', contentId: 'series-5', title: 'Midnight Diner', poster: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=600&fit=crop', episodeInfo: 'S1 E4 · Curry Rice', progress: 0.15, duration: '40m', type: 'series' },
  { id: 'cw-4', contentId: 'movie-8', title: 'Midnight Express', poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop', progress: 0.88, duration: '2h 08m', type: 'movie' },
];

// ===== USER PROFILE =====
export const userProfile: UserProfile = {
  id: 'user-1',
  name: 'John Anderson',
  email: 'john@streamcontrol.com',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
  memberSince: 'January 2023',
  plan: 'Premium',
  watchlistCount: 14,
  watchedCount: 87,
};

// ===== HERO BANNERS =====
export interface HeroBanner {
  id: string;
  contentId: string;
  title: string;
  subtitle: string;
  backdrop: string;
  genre: string[];
  rating: number;
  year: number;
  type: 'movie' | 'series';
  badge?: string;
}

export const heroBanners: HeroBanner[] = [
  { id: 'hb-1', contentId: 'movie-1', title: 'Neon Horizon', subtitle: 'The future is already here', backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=500&fit=crop', genre: ['Sci-Fi', 'Thriller'], rating: 8.7, year: 2024, type: 'movie', badge: 'EXCLUSIVE' },
  { id: 'hb-2', contentId: 'series-1', title: 'Shadow Protocol', subtitle: 'Trust no one', backdrop: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800&h=500&fit=crop', genre: ['Action', 'Thriller'], rating: 9.0, year: 2024, type: 'series', badge: 'NEW SEASON' },
  { id: 'hb-3', contentId: 'movie-6', title: 'The Art of Silence', subtitle: 'Hear the music in a different way', backdrop: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=500&fit=crop', genre: ['Drama', 'Romance'], rating: 9.3, year: 2024, type: 'movie', badge: 'AWARD WINNER' },
  { id: 'hb-4', contentId: 'movie-2', title: 'The Last Frontier', subtitle: 'Beyond the stars, beyond imagination', backdrop: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&h=500&fit=crop', genre: ['Sci-Fi', 'Drama'], rating: 9.1, year: 2024, type: 'movie' },
];

// ===== HELPER FUNCTIONS =====
export function getAllContent(): (Movie | Series)[] {
  return [...movies, ...series];
}

export function getContentById(id: string): Movie | Series | undefined {
  return getAllContent().find(c => c.id === id);
}

export function getTrendingContent(): (Movie | Series)[] {
  return getAllContent().filter(c => c.isTrending);
}

export function getNewContent(): (Movie | Series)[] {
  return getAllContent().filter(c => c.isNew);
}

export function getFeaturedContent(): (Movie | Series)[] {
  return getAllContent().filter(c => c.isFeatured);
}

export function getContentByGenre(genre: string): (Movie | Series)[] {
  return getAllContent().filter(c => c.genre.includes(genre));
}

export function searchContent(query: string): (Movie | Series)[] {
  const q = query.toLowerCase();
  return getAllContent().filter(c =>
    c.title.toLowerCase().includes(q) ||
    c.description.toLowerCase().includes(q) ||
    c.genre.some(g => g.toLowerCase().includes(q)) ||
    c.cast.some(a => a.toLowerCase().includes(q))
  );
}

export function searchChannels(query: string): LiveChannel[] {
  const q = query.toLowerCase();
  return liveChannels.filter(ch =>
    ch.name.toLowerCase().includes(q) ||
    ch.category.toLowerCase().includes(q) ||
    (ch.currentProgram?.toLowerCase().includes(q))
  );
}

export function formatViewers(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}
