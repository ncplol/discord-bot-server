import React, { useState, useEffect } from 'react';
import './Soundboard.css';

function Soundboard({ guildId, onApiCall, isLoading, canControl }) {
  const [soundEffects, setSoundEffects] = useState([]);

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

  return (
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
  );
}

export default Soundboard;
