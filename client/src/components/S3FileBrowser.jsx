import { useState, useEffect } from 'react';
import './S3FileBrowser.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function formatDuration(seconds) {
  if (!seconds) return 'Unknown';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function S3FileBrowser({ guildId, onApiCall, canControl }) {
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
  
  // Play mode state
  const [playMode, setPlayMode] = useState('queue');

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
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

        {/* Play Mode */}
        <div className="control-group play-mode-group">
          <label>
            <input
              type="radio"
              value="queue"
              checked={playMode === 'queue'}
              onChange={() => setPlayMode('queue')}
              disabled={!canControl}
            />
            Add to Queue
          </label>
          <label>
            <input
              type="radio"
              value="next"
              checked={playMode === 'next'}
              onChange={() => setPlayMode('next')}
              disabled={!canControl}
            />
            Play Next
          </label>
          <label>
            <input
              type="radio"
              value="now"
              checked={playMode === 'now'}
              onChange={() => setPlayMode('now')}
              disabled={!canControl}
            />
            Play Now
          </label>
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
          <>
            <div className="file-list-header">
              <span>Title</span>
              <span>Artist</span>
              <span>Album</span>
              <span>Duration</span>
              <span>Actions</span>
            </div>
            {filteredFiles.map((file, index) => (
              <div key={file.key || index} className="s3-file-item">
                <span className="file-title">{file.title || file.filename}</span>
                <span className="file-artist">{file.artist || 'Unknown'}</span>
                <span className="file-album">{file.album || '-'}</span>
                <span className="file-duration">{formatDuration(file.duration)}</span>
                <div className="file-actions">
                  {canControl && (
                    <>
                      <button
                        onClick={() => handlePlay(file, playMode)}
                        className="btn-play"
                        title={`${playMode === 'queue' ? 'Add to Queue' : playMode === 'next' ? 'Play Next' : 'Play Now'}`}
                      >
                        {playMode === 'queue' ? '➕' : playMode === 'next' ? '⏭️' : '▶️'}
                      </button>
                      <button
                        onClick={() => handlePlay(file, 'queue')}
                        className="btn-play-small"
                        title="Add to Queue"
                        disabled={playMode === 'queue'}
                      >
                        +Q
                      </button>
                      <button
                        onClick={() => handlePlay(file, 'next')}
                        className="btn-play-small"
                        title="Play Next"
                        disabled={playMode === 'next'}
                      >
                        +N
                      </button>
                      <button
                        onClick={() => handlePlay(file, 'now')}
                        className="btn-play-small"
                        title="Play Now"
                        disabled={playMode === 'now'}
                      >
                        ▶
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default S3FileBrowser;

