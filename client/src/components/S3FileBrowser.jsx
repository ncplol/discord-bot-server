import { useState, useEffect } from 'react';
import './PlaybackStatus.css';
import './S3FileBrowser.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

// Mock S3 files for development
const MOCK_S3_FILES = [
  {
    key: 'music/song1.mp3',
    filename: 'song1.mp3',
    url: 'https://example.com/song1.mp3',
    title: 'Amazing Song',
    artist: 'Great Artist',
    album: 'Best Album',
    duration: 245,
    size: 5123456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song2.mp3',
    filename: 'song2.mp3',
    url: 'https://example.com/song2.mp3',
    title: 'Epic Track',
    artist: 'Great Artist',
    album: 'Best Album',
    duration: 180,
    size: 4123456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song3.mp3',
    filename: 'song3.mp3',
    url: 'https://example.com/song3.mp3',
    title: 'Cool Beat',
    artist: 'Another Artist',
    album: 'Cool Album',
    duration: 320,
    size: 6123456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song4.mp3',
    filename: 'song4.mp3',
    url: 'https://example.com/song4.mp3',
    title: 'Jazz Number',
    artist: 'Jazz Artist',
    album: null,
    duration: 195,
    size: 3923456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song5.mp3',
    filename: 'song5.mp3',
    url: 'https://example.com/song5.mp3',
    title: 'Rock Anthem',
    artist: 'Rock Band',
    album: 'Rock Collection',
    duration: 267,
    size: 5234567,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song6.mp3',
    filename: 'song6.mp3',
    url: 'https://example.com/song6.mp3',
    title: 'Electronic Dreams',
    artist: 'EDM Producer',
    album: 'Digital Realm',
    duration: 298,
    size: 6123456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song7.mp3',
    filename: 'song7.mp3',
    url: 'https://example.com/song7.mp3',
    title: 'Classical Masterpiece',
    artist: 'Symphony Orchestra',
    album: 'Orchestral Works',
    duration: 445,
    size: 8234567,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song8.mp3',
    filename: 'song8.mp3',
    url: 'https://example.com/song8.mp3',
    title: 'Acoustic Ballad',
    artist: 'Singer Songwriter',
    album: 'Unplugged Sessions',
    duration: 223,
    size: 4123456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song9.mp3',
    filename: 'song9.mp3',
    url: 'https://example.com/song9.mp3',
    title: 'Hip Hop Flow',
    artist: 'Rap Artist',
    album: 'Street Vibes',
    duration: 189,
    size: 3923456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song10.mp3',
    filename: 'song10.mp3',
    url: 'https://example.com/song10.mp3',
    title: 'Blues Journey',
    artist: 'Blues Master',
    album: 'Delta Blues',
    duration: 312,
    size: 5234567,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song11.mp3',
    filename: 'song11.mp3',
    url: 'https://example.com/song11.mp3',
    title: 'Indie Pop Hit',
    artist: 'Indie Band',
    album: 'Summer Vibes',
    duration: 201,
    size: 4123456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song12.mp3',
    filename: 'song12.mp3',
    url: 'https://example.com/song12.mp3',
    title: 'Reggae Rhythm',
    artist: 'Reggae Collective',
    album: 'Island Sounds',
    duration: 278,
    size: 4923456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song13.mp3',
    filename: 'song13.mp3',
    url: 'https://example.com/song13.mp3',
    title: 'Metal Thunder',
    artist: 'Metal Legends',
    album: 'Heavy Metal',
    duration: 356,
    size: 6723456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song14.mp3',
    filename: 'song14.mp3',
    url: 'https://example.com/song14.mp3',
    title: 'Country Roads',
    artist: 'Country Star',
    album: 'Rural Melodies',
    duration: 234,
    size: 4523456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song15.mp3',
    filename: 'song15.mp3',
    url: 'https://example.com/song15.mp3',
    title: 'Funk Groove',
    artist: 'Funk Ensemble',
    album: 'Groove Machine',
    duration: 289,
    size: 5423456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song16.mp3',
    filename: 'song16.mp3',
    url: 'https://example.com/song16.mp3',
    title: 'Ambient Space',
    artist: 'Ambient Composer',
    album: 'Cosmic Sounds',
    duration: 412,
    size: 7823456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song17.mp3',
    filename: 'song17.mp3',
    url: 'https://example.com/song17.mp3',
    title: 'Latin Fiesta',
    artist: 'Latin Band',
    album: 'Fiesta Latina',
    duration: 256,
    size: 4823456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song18.mp3',
    filename: 'song18.mp3',
    url: 'https://example.com/song18.mp3',
    title: 'R&B Smooth',
    artist: 'R&B Artist',
    album: 'Smooth Sessions',
    duration: 267,
    size: 5023456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song19.mp3',
    filename: 'song19.mp3',
    url: 'https://example.com/song19.mp3',
    title: 'Punk Energy',
    artist: 'Punk Rockers',
    album: 'Punk Revival',
    duration: 145,
    size: 2923456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song20.mp3',
    filename: 'song20.mp3',
    url: 'https://example.com/song20.mp3',
    title: 'Folk Tale',
    artist: 'Folk Singer',
    album: 'Folk Stories',
    duration: 298,
    size: 5623456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song21.mp3',
    filename: 'song21.mp3',
    url: 'https://example.com/song21.mp3',
    title: 'Techno Pulse',
    artist: 'Techno DJ',
    album: 'Club Mixes',
    duration: 378,
    size: 7123456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song22.mp3',
    filename: 'song22.mp3',
    url: 'https://example.com/song22.mp3',
    title: 'Soul Revival',
    artist: 'Soul Singer',
    album: 'Soul Classics',
    duration: 245,
    size: 4623456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song23.mp3',
    filename: 'song23.mp3',
    url: 'https://example.com/song23.mp3',
    title: 'Gospel Power',
    artist: 'Gospel Choir',
    album: 'Gospel Collection',
    duration: 334,
    size: 6323456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song24.mp3',
    filename: 'song24.mp3',
    url: 'https://example.com/song24.mp3',
    title: 'World Music Fusion',
    artist: 'World Ensemble',
    album: 'Global Sounds',
    duration: 289,
    size: 5423456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song25.mp3',
    filename: 'song25.mp3',
    url: 'https://example.com/song25.mp3',
    title: 'Jazz Fusion',
    artist: 'Jazz Quartet',
    album: 'Modern Jazz',
    duration: 312,
    size: 5823456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song26.mp3',
    filename: 'song26.mp3',
    url: 'https://example.com/song26.mp3',
    title: 'Alternative Rock',
    artist: 'Alt Rock Band',
    album: 'Alternative Hits',
    duration: 223,
    size: 4223456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song27.mp3',
    filename: 'song27.mp3',
    url: 'https://example.com/song27.mp3',
    title: 'Dance Floor',
    artist: 'Dance Producer',
    album: 'Dance Party',
    duration: 267,
    size: 5023456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song28.mp3',
    filename: 'song28.mp3',
    url: 'https://example.com/song28.mp3',
    title: 'Opera Aria',
    artist: 'Opera Singer',
    album: 'Opera Classics',
    duration: 445,
    size: 8423456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song29.mp3',
    filename: 'song29.mp3',
    url: 'https://example.com/song29.mp3',
    title: 'Trance Journey',
    artist: 'Trance Artist',
    album: 'Trance Experience',
    duration: 456,
    size: 8623456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song30.mp3',
    filename: 'song30.mp3',
    url: 'https://example.com/song30.mp3',
    title: 'Ballad of Memories',
    artist: 'Ballad Singer',
    album: 'Emotional Ballads',
    duration: 289,
    size: 5423456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song31.mp3',
    filename: 'song31.mp3',
    url: 'https://example.com/song31.mp3',
    title: 'Celtic Melody',
    artist: 'Celtic Ensemble',
    album: 'Celtic Traditions',
    duration: 312,
    size: 5823456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song32.mp3',
    filename: 'song32.mp3',
    url: 'https://example.com/song32.mp3',
    title: 'House Vibes',
    artist: 'House DJ',
    album: 'House Collection',
    duration: 334,
    size: 6323456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song33.mp3',
    filename: 'song33.mp3',
    url: 'https://example.com/song33.mp3',
    title: 'Progressive Rock',
    artist: 'Prog Rock Band',
    album: 'Progressive Works',
    duration: 512,
    size: 9723456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song34.mp3',
    filename: 'song34.mp3',
    url: 'https://example.com/song34.mp3',
    title: 'Synthwave Retro',
    artist: 'Synthwave Artist',
    album: 'Retro Future',
    duration: 278,
    size: 5223456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song35.mp3',
    filename: 'song35.mp3',
    url: 'https://example.com/song35.mp3',
    title: 'Bluegrass Pick',
    artist: 'Bluegrass Band',
    album: 'Bluegrass Favorites',
    duration: 201,
    size: 3823456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song36.mp3',
    filename: 'song36.mp3',
    url: 'https://example.com/song36.mp3',
    title: 'Drum and Bass',
    artist: 'DnB Producer',
    album: 'Drum and Bass Mix',
    duration: 356,
    size: 6723456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song37.mp3',
    filename: 'song37.mp3',
    url: 'https://example.com/song37.mp3',
    title: 'Ska Revival',
    artist: 'Ska Band',
    album: 'Ska Collection',
    duration: 223,
    size: 4223456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song38.mp3',
    filename: 'song38.mp3',
    url: 'https://example.com/song38.mp3',
    title: 'Grunge Sound',
    artist: 'Grunge Band',
    album: 'Grunge Era',
    duration: 267,
    size: 5023456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song39.mp3',
    filename: 'song39.mp3',
    url: 'https://example.com/song39.mp3',
    title: 'Acid Jazz',
    artist: 'Acid Jazz Group',
    album: 'Acid Jazz Sessions',
    duration: 334,
    size: 6323456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song40.mp3',
    filename: 'song40.mp3',
    url: 'https://example.com/song40.mp3',
    title: 'Lo-Fi Chill',
    artist: 'Lo-Fi Producer',
    album: 'Chill Beats',
    duration: 189,
    size: 3623456,
    lastModified: new Date().toISOString(),
  },
  {
    key: 'music/song41.mp3',
    filename: 'song41.mp3',
    url: 'https://example.com/song41.mp3',
    title: 'Baroque Piece',
    artist: 'Baroque Ensemble',
    album: 'Baroque Works',
    duration: 445,
    size: 8423456,
    lastModified: new Date().toISOString(),
  },
];

function formatDuration(seconds) {
  if (!seconds) return 'Unknown';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function S3FileBrowser({ guildId, onApiCall, canControl, playMode, onPlayModeChange }) {
  const [files, setFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterArtist, setFilterArtist] = useState('');
  const [filterAlbum, setFilterAlbum] = useState('');
  
  // Available artists and albums for filters
  const [availableArtists, setAvailableArtists] = useState([]);
  const [availableAlbums, setAvailableAlbums] = useState([]);

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    
    // In dev mode, use mock data
    if (DEV_MODE) {
      setTimeout(() => {
        setFiles(MOCK_S3_FILES);
        setFilteredFiles(MOCK_S3_FILES);
        const artists = [...new Set(MOCK_S3_FILES.map(f => f.artist).filter(Boolean))].sort();
        const albums = [...new Set(MOCK_S3_FILES.map(f => f.album).filter(Boolean))].sort();
        setAvailableArtists(artists);
        setAvailableAlbums(albums);
        setLoading(false);
      }, 500);
      return;
    }
    
    try {
      const params = new URLSearchParams({
        search: searchQuery,
        sort: sortBy,
        order: sortOrder,
        ...(filterArtist && { filterArtist }),
        ...(filterAlbum && { filterAlbum }),
      });
      
      const response = await fetch(`${API_BASE_URL}/api/s3/files?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch S3 files');
      }
      const data = await response.json();
      setFiles(data.files || []);
      setFilteredFiles(data.files || []);
      
      // Extract unique artists and albums
      const artists = [...new Set(data.files.map(f => f.artist).filter(Boolean))].sort();
      const albums = [...new Set(data.files.map(f => f.album).filter(Boolean))].sort();
      setAvailableArtists(artists);
      setAvailableAlbums(albums);
      
    } catch (err) {
      console.error('Error fetching S3 files:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [searchQuery, sortBy, sortOrder, filterArtist, filterAlbum]);

  const handlePlay = (file, mode) => {
    onApiCall(() => fetch(`${API_BASE_URL}/api/music/${guildId}/play/s3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: file.key, mode }),
    }));
  };

  if (loading && files.length === 0) {
    return (
      <div className="s3-browser-container">
        <div className="loading-message">Loading files...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="s3-browser-container">
        <div className="error-message">Error: {error}</div>
        <button onClick={fetchFiles} className="btn-retry">Retry</button>
      </div>
    );
  }

  return (
    <div className="s3-browser-container">
      <div className="s3-controls">
        {/* Search */}
        <div className="control-group">
          <label htmlFor="s3-search">Search:</label>
          <input
            id="s3-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, artist, album..."
            className="search-input"
          />
        </div>

        {/* Sort */}
        <div className="control-group">
          <label htmlFor="s3-sort">Sort by:</label>
          <select
            id="s3-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="title">Title</option>
            <option value="artist">Artist</option>
            <option value="album">Album</option>
            <option value="duration">Duration</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="sort-order-btn"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        {/* Filter by Artist */}
        <div className="control-group">
          <label htmlFor="s3-filter-artist">Filter by Artist:</label>
          <select
            id="s3-filter-artist"
            value={filterArtist}
            onChange={(e) => setFilterArtist(e.target.value)}
            className="filter-select"
          >
            <option value="">All Artists</option>
            {availableArtists.map(artist => (
              <option key={artist} value={artist}>{artist}</option>
            ))}
          </select>
        </div>

        {/* Filter by Album */}
        <div className="control-group">
          <label htmlFor="s3-filter-album">Filter by Album:</label>
          <select
            id="s3-filter-album"
            value={filterAlbum}
            onChange={(e) => setFilterAlbum(e.target.value)}
            className="filter-select"
          >
            <option value="">All Albums</option>
            {availableAlbums.map(album => (
              <option key={album} value={album}>{album}</option>
            ))}
          </select>
        </div>
      </div>

      {/* File List */}
      <div className="s3-library-section">
        <h4 className="library-header">Library ({filteredFiles.length})</h4>
        <div className="s3-file-list">
          {filteredFiles.length === 0 ? (
            <div className="no-files-message">
              {searchQuery || filterArtist || filterAlbum 
                ? 'No files match your search/filter criteria.' 
                : 'No audio files found in S3 bucket.'}
            </div>
          ) : (
            filteredFiles.map((file, index) => (
              <div key={file.key || index} className={`track ${canControl ? 'clickable' : ''}`} onClick={canControl ? () => handlePlay(file, playMode) : undefined}>
                <span className="track-position">{index + 1}.</span>
                <div className="track-details">
                  <p className="track-title">{file.title || file.filename}</p>
                  <p className="track-metadata">
                    {file.artist || 'Unknown Artist'}
                    {file.album && ` • ${file.album}`}
                    {file.duration && ` • ${formatDuration(file.duration)}`}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Play Mode Selector */}
      <div className="play-mode-selector">
        <label>
          <input 
            type="radio" 
            value="queue" 
            checked={playMode === 'queue'} 
            onChange={() => onPlayModeChange && onPlayModeChange('queue')}
            disabled={!canControl} 
          />
          Add to Queue
        </label>
        <label>
          <input 
            type="radio" 
            value="next" 
            checked={playMode === 'next'} 
            onChange={() => onPlayModeChange && onPlayModeChange('next')}
            disabled={!canControl} 
          />
          Play Next
        </label>
        <label>
          <input 
            type="radio" 
            value="now" 
            checked={playMode === 'now'} 
            onChange={() => onPlayModeChange && onPlayModeChange('now')}
            disabled={!canControl} 
          />
          Play Now
        </label>
      </div>
    </div>
  );
}

export default S3FileBrowser;
