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
        <div className="loading-message">Loading S3 files...</div>
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
