import { useState } from 'react';
import './ConnectionManager.css';

function ConnectionManager({ guildId, isConnected, onConnectionChange }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleJoin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/music/${guildId}/join`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join channel');
      }
      onConnectionChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeave = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await fetch(`/api/music/${guildId}/leave`, { method: 'POST' });
      onConnectionChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="connection-manager">
      {isConnected ? (
        <button onClick={handleLeave} disabled={isLoading} className="btn-leave">
          {isLoading ? 'Leaving...' : 'Leave Voice Channel'}
        </button>
      ) : (
        <button onClick={handleJoin} disabled={isLoading} className="btn-join">
          {isLoading ? 'Joining...' : 'Join Voice Channel'}
        </button>
      )}
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default ConnectionManager;
