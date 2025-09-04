import React, { useState, useEffect } from 'react';
import './Soundboard.css';

function Soundboard({ guildId, onApiCall, isLoading, canControl, sfxVolume }) {
  const [soundEffects, setSoundEffects] = useState([]);
  const [currentSfxVolume, setCurrentSfxVolume] = useState(sfxVolume);

  useEffect(() => {
    setCurrentSfxVolume(sfxVolume);
  }, [sfxVolume]);

  useEffect(() => {
    const fetchSfx = async () => {
      try {
        const response = await fetch('/api/sfx');
        if (!response.ok) {
          throw new Error('Failed to fetch sound effects');
        }
        const data = await response.json();
        setSoundEffects(data);
      } catch (error) {
        console.error('Error fetching SFX list:', error);
      }
    };

    fetchSfx();
  }, []);

  const playSfx = (effectId) => {
    onApiCall(async () => {
      const response = await fetch(`/api/music/${guildId}/sfx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ effect: effectId }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to play sound effect');
      }
      console.log(`Played ${effectId}`);
      return await response.json();
    });
  };

  const handleVolumeChange = (level) => {
    setCurrentSfxVolume(level);
  };

  const handleVolumeCommit = (level) => {
    onApiCall(() => fetch(`/api/music/${guildId}/sfx-volume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: parseInt(level, 10) }),
    }));
  };

  return (
    <>
      <div className="soundboard-grid">
        {soundEffects.map((effect) => (
          <button
            key={effect.id}
            className="sfx-button"
            onClick={() => playSfx(effect.id)}
            disabled={isLoading || !canControl}
          >
            {effect.name}
          </button>
        ))}
      </div>
      <div className="volume-control-sfx">
        <span>🔊 SFX</span>
        <input 
          type="range" 
          min="0" 
          max="200" 
          value={currentSfxVolume || 100}
          onChange={(e) => handleVolumeChange(e.target.value)}
          onMouseUp={(e) => handleVolumeCommit(e.target.value)}
          onTouchEnd={(e) => handleVolumeCommit(e.target.value)}
          disabled={isLoading || !canControl}
        />
        <span>{currentSfxVolume || 100}%</span>
      </div>
    </>
  );
}

export default Soundboard;
