import React from 'react';
import './Soundboard.css';

const soundEffects = [
  'party_horn', 'applause', 'bell', 'alert',
  'drum_roll', 'fanfare', 'notification', 'celebration'
];

function Soundboard({ guildId }) {
  const playSfx = async (effect) => {
    try {
      const response = await fetch(`/api/music/${guildId}/sfx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ effect }),
      });
      if (!response.ok) {
        throw new Error('Failed to play sound effect');
      }
      // You could add a visual confirmation here if you'd like
      console.log(`Played ${effect}`);
    } catch (error) {
      console.error('Error playing sound effect:', error);
    }
  };

  return (
    <div className="soundboard-grid">
      {soundEffects.map((effect) => (
        <button
          key={effect}
          className="sfx-button"
          onClick={() => playSfx(effect)}
        >
          {effect.replace('_', ' ')}
        </button>
      ))}
    </div>
  );
}

export default Soundboard;
