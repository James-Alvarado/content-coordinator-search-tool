// This local dataset lets a beginner demonstrate the complete workflow without uploading a file.
const sampleCatalogData = [
  { id: 1, title: "Midnight in Cartagena", contentType: "Movie", genre: "Drama", country: "Colombia", language: "Spanish", releaseYear: 2023, status: "Under Review", runtime: 112, rating: 8.1, acquisitionCost: 2400000 },
  { id: 2, title: "Northern Signals", contentType: "TV Show", genre: "Mystery", country: "Canada", language: "English", releaseYear: 2024, status: "Acquired", runtime: 48, rating: 7.8, acquisitionCost: 4100000 },
  { id: 3, title: "The Paper Bridge", contentType: "Movie", genre: "Family", country: "Japan", language: "Japanese", releaseYear: 2021, status: "Available", runtime: 98, rating: 7.4, acquisitionCost: 1800000 },
  { id: 4, title: "Second Kitchen", contentType: "TV Show", genre: "Comedy", country: "Mexico", language: "Spanish", releaseYear: 2022, status: "Acquired", runtime: 30, rating: 7.6, acquisitionCost: 2900000 },
  { id: 5, title: "Orbit of Blue", contentType: "Movie", genre: "Science Fiction", country: "South Korea", language: "Korean", releaseYear: 2025, status: "Under Review", runtime: 124, rating: 8.4, acquisitionCost: 5200000 },
  { id: 6, title: "Harbor Lights", contentType: "TV Show", genre: "Drama", country: "United Kingdom", language: "English", releaseYear: 2020, status: "Available", runtime: 52, rating: 8.0, acquisitionCost: 3600000 },
  { id: 7, title: "Rhythm of the Market", contentType: "Movie", genre: "Musical", country: "Nigeria", language: "English", releaseYear: 2023, status: "Acquired", runtime: 106, rating: 7.7, acquisitionCost: 2100000 },
  { id: 8, title: "Under the Jacaranda", contentType: "TV Show", genre: "Romance", country: "Argentina", language: "Spanish", releaseYear: 2024, status: "Under Review", runtime: 44, rating: 7.9, acquisitionCost: 3200000 },
  { id: 9, title: "The Last Mapmaker", contentType: "Movie", genre: "Adventure", country: "New Zealand", language: "English", releaseYear: 2019, status: "Available", runtime: 118, rating: 7.5, acquisitionCost: 2700000 },
  { id: 10, title: "Sunday Bicycle Club", contentType: "TV Show", genre: "Comedy", country: "France", language: "French", releaseYear: 2022, status: "Rejected", runtime: 28, rating: 6.9, acquisitionCost: 1500000 },
  { id: 11, title: "Salt and Memory", contentType: "Movie", genre: "Documentary", country: "Chile", language: "Spanish", releaseYear: 2021, status: "Acquired", runtime: 91, rating: 8.3, acquisitionCost: 1200000 },
  { id: 12, title: "Code for Tomorrow", contentType: "TV Show", genre: "Drama", country: "India", language: "Hindi", releaseYear: 2025, status: "Under Review", runtime: 42, rating: 8.2, acquisitionCost: 3800000 },
  { id: 13, title: "A Map of Rain", contentType: "Movie", genre: "Drama", country: "Brazil", language: "Portuguese", releaseYear: 2020, status: "Available", runtime: 109, rating: 7.3, acquisitionCost: 1950000 },
  { id: 14, title: "Small Wonders Lab", contentType: "TV Show", genre: "Family", country: "United States", language: "English", releaseYear: 2023, status: "Acquired", runtime: 26, rating: 7.2, acquisitionCost: 2600000 },
  { id: 15, title: "The Quiet Violin", contentType: "Movie", genre: "Drama", country: "Italy", language: "Italian", releaseYear: 2018, status: "Rejected", runtime: 103, rating: 6.8, acquisitionCost: 900000 },
  { id: 16, title: "Desert Frequency", contentType: "TV Show", genre: "Science Fiction", country: "Morocco", language: "Arabic", releaseYear: 2024, status: "Under Review", runtime: 46, rating: 7.8, acquisitionCost: 3400000 },
  { id: 17, title: "Letters from the Fjord", contentType: "Movie", genre: "Romance", country: "Norway", language: "Norwegian", releaseYear: 2022, status: "Available", runtime: 101, rating: 7.1, acquisitionCost: 1700000 },
  { id: 18, title: "Green Line Detectives", contentType: "TV Show", genre: "Mystery", country: "Germany", language: "German", releaseYear: 2021, status: "Acquired", runtime: 50, rating: 8.0, acquisitionCost: 3100000 },
  { id: 19, title: "One More Sunrise", contentType: "Movie", genre: "Comedy", country: "Philippines", language: "Tagalog", releaseYear: 2025, status: "Under Review", runtime: 96, rating: null, acquisitionCost: 1450000 },
  { id: 20, title: "River School", contentType: "TV Show", genre: "Documentary", country: "Kenya", language: "Swahili", releaseYear: 2023, status: "Available", runtime: 36, rating: 7.6, acquisitionCost: null }
];
