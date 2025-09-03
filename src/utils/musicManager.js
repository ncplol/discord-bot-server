const { AudioPlayer, AudioPlayerStatus, createAudioResource, joinVoiceChannel } = require('@discordjs/voice');
const { spawn } = require('child_process');

class MusicManager {
  constructor() {
    this.players = new Map();
    this.queues = new Map();
    this.previousTracks = new Map(); // For the 'previous' command
    this.loopModes = new Map(); // 'none', 'track', 'queue'
    this.nowPlaying = new Map();
    this.connections = new Map();
    this.streamProcesses = new Map(); // Add a map to track yt-dlp processes
  }

  // Join a voice channel
  async joinVoiceChannel(interaction) {
    // Try multiple possible locations for voice channel information
    let voiceChannel = null;
    
    // Method 1: Check if member has voice channel
    if (interaction.member?.voice?.channel) {
      voiceChannel = interaction.member.voice.channel;
    }
    // Method 2: Check if member has voice channelId and fetch the channel
    else if (interaction.member?.voice?.channelId) {
      voiceChannel = interaction.guild?.channels.cache.get(interaction.member.voice.channelId);
    }
    // Method 3: Check if user is in any voice channel in the guild
    else if (interaction.guild) {
      try {
        const member = await interaction.guild.members.fetch(interaction.userId);
        if (member.voice.channel) {
          voiceChannel = member.voice.channel;
        }
      } catch (fetchError) {
        console.log('⚠️ Failed to fetch member voice state:', fetchError.message);
      }
    }
    
    if (!voiceChannel) {
      throw new Error('You need to be in a voice channel to use this command!');
    }
    
    // Verify it's actually a voice channel
    if (voiceChannel.type !== 2) { // 2 = GuildVoiceChannel
      throw new Error('The channel you\'re in is not a voice channel!');
    }

    const guildId = interaction.guildId;
    
    // Check if already connected to this guild
    if (this.connections.has(guildId)) {
      console.log(`Already connected to guild ${guildId}`);
      return;
    }

    try {
      // Join the voice channel
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      // Create audio player
      const player = new AudioPlayer();
      
      // Store connection and player
      this.connections.set(guildId, connection);
      this.players.set(guildId, player);
      
      // Subscribe player to connection
      connection.subscribe(player);
      
      console.log(`🎵 Joined voice channel: ${voiceChannel.name} in guild ${guildId}`);
      
    } catch (error) {
      console.error('Error joining voice channel:', error);
      throw new Error('Failed to join voice channel. Please try again.');
    }
  }

  // Leave voice channel
  leaveVoiceChannel(guildId) {
    const connection = this.connections.get(guildId);
    const player = this.players.get(guildId);
    const process = this.streamProcesses.get(guildId);

    // Kill the streaming process if it exists
    if (process) {
      process.kill();
      this.streamProcesses.delete(guildId);
    }
    
    if (player) {
      player.stop();
      this.players.delete(guildId);
    }
    
    if (connection) {
      connection.destroy();
      this.connections.delete(guildId);
    }
    
    this.queues.delete(guildId);
    this.nowPlaying.delete(guildId);
    
    console.log(`👋 Left voice channel in guild ${guildId}`);
  }

  // Add track to queue
  addToQueue(guildId, track) {
    if (!this.queues.has(guildId)) {
      this.queues.set(guildId, []);
    }
    
    const queue = this.queues.get(guildId);
    queue.push(track);
    
    console.log(`📝 Added "${track.title}" to queue in guild ${guildId}`);
    
    // If this is the first track, start playing
    // if (queue.length === 1) {
    //   this.playNext(guildId);
    // }
    
    return queue.length;
  }

  // Add track to the front of the queue
  addToQueueFront(guildId, track) {
    if (!this.queues.has(guildId)) {
      this.queues.set(guildId, []);
    }
    
    const queue = this.queues.get(guildId);
    queue.unshift(track); // Add to the beginning of the array
    
    console.log(`📝 Added "${track.title}" to the front of the queue in guild ${guildId}`);
    
    return queue.length;
  }

  // Play a track immediately
  async playTrack(guildId, track) {
    const player = this.players.get(guildId);
    if (!player) {
      throw new Error('Not connected to a voice channel!');
    }

    try {
      if (!track.url) {
        throw new Error('Track URL is undefined or null');
      }

      console.log('🔗 Attempting to stream directly from URL:', track.url);

      // Spawn yt-dlp to get a raw audio stream, piping stdout
      const ytdlp = spawn('yt-dlp', [
        track.url,
        '--format', 'bestaudio/best',
        '-o', '-', // Pipe output to stdout
        '--no-playlist',
        '--quiet', // Suppress verbose logs
      ]);

      // Store the process so we can kill it later
      this.streamProcesses.set(guildId, ytdlp);

      // Create audio resource from the ytdlp stdout stream
      const resource = createAudioResource(ytdlp.stdout, {
        inlineVolume: true,
      });
      
      console.log('🔧 Audio resource created from direct stream.');

      // --- Unified End-of-Stream Logic ---
      // This function is called when the stream is finished, closed, or errors.
      const onStreamEnd = () => {
        // Ensure this logic only runs once per resource.
        if (resource.streamEnded) return;
        resource.streamEnded = true;

        this.streamProcesses.delete(guildId); // Clean up process reference
        const currentTrack = this.nowPlaying.get(guildId);
        const loopMode = this.loopModes.get(guildId) || 'none';

        if (currentTrack) {
          console.log(`⏹️ Finished playing: ${currentTrack.title}`);
          // Handle looping
          if (loopMode === 'track') {
            this.queues.get(guildId).unshift(currentTrack); // Re-add to front
          } else if (loopMode === 'queue') {
            this.queues.get(guildId).push(currentTrack); // Re-add to end
          }
        }

        const queue = this.queues.get(guildId);
        if (queue && queue.length > 0) {
          this.playNext(guildId);
        } else {
          this.nowPlaying.delete(guildId);
          setTimeout(() => {
            if (this.queues.get(guildId)?.length === 0 && !this.nowPlaying.get(guildId)) {
              console.log(`🔄 Auto-disconnecting from guild ${guildId} - queue empty`);
              this.leaveVoiceChannel(guildId);
            }
          }, 30000);
        }
      };

      // Attach the unified handler to all relevant stream events
      resource.playStream.on('finish', onStreamEnd);
      resource.playStream.on('close', onStreamEnd);
      resource.playStream.on('error', (error) => {
        console.error('❌ Audio resource stream error:', error);
        onStreamEnd(); // Still try to play the next song on error
      });
      
      // Log any errors from the ytdlp process itself
      ytdlp.stderr.on('data', (data) => {
        console.error(`yt-dlp stderr: ${data}`);
      });

      // Clean up process reference when the process exits
      ytdlp.on('close', () => {
        this.streamProcesses.delete(guildId);
      });

      player.play(resource);
      console.log(`🎵 Playing: ${track.title}`);

    } catch (error) {
      console.error('Error playing track:', error);
      throw new Error('Failed to play track. Please try again.');
    }
  }

  // Remove a track from the queue by its index
  removeTrack(guildId, index) {
    const queue = this.queues.get(guildId);
    if (queue && index >= 0 && index < queue.length) {
      const removedTrack = queue.splice(index, 1);
      console.log(`🗑️ Removed "${removedTrack[0].title}" from queue in guild ${guildId}`);
      return removedTrack[0];
    }
    return null;
  }

  // Play next track in queue
  async playNext(guildId) {
    const queue = this.queues.get(guildId);
    const player = this.players.get(guildId);
    
    if (!queue || !player || queue.length === 0) {
      this.nowPlaying.delete(guildId);
      setTimeout(() => {
        if (this.queues.get(guildId)?.length === 0 && !this.nowPlaying.get(guildId)) {
          console.log(`🔄 Auto-disconnecting from guild ${guildId} - queue empty`);
          this.leaveVoiceChannel(guildId);
        }
      }, 30000); // Wait 30 seconds before auto-disconnecting
      return;
    }
    
    // Add the completed track to the previous tracks queue
    const lastPlayed = this.nowPlaying.get(guildId);
    if (lastPlayed) {
      if (!this.previousTracks.has(guildId)) {
        this.previousTracks.set(guildId, []);
      }
      this.previousTracks.get(guildId).unshift(lastPlayed);
    }

    const nextTrack = queue.shift();
    this.nowPlaying.set(guildId, nextTrack);
    
    try {
      await this.playTrack(guildId, nextTrack);
    } catch (error) {
      console.error('Error playing next track:', error);
      // Don't recursively call playNext to prevent infinite loops
      // Just log the error and let the user handle it
    }
  }

  // Play the previous track
  async playPrevious(guildId) {
    const previous = this.previousTracks.get(guildId);
    if (!previous || previous.length === 0) {
      return false; // No previous track to play
    }

    // Add the current track back to the front of the main queue
    const currentTrack = this.nowPlaying.get(guildId);
    if (currentTrack) {
      this.queues.get(guildId).unshift(currentTrack);
    }
    
    // Get the last track from the history
    const previousTrack = previous.shift();
    
    // Add it to the front of the queue and skip the current track
    this.addToQueueFront(guildId, previousTrack);
    this.skipTrack(guildId);

    return true;
  }

  // Set the loop mode for a guild
  setLoopMode(guildId, mode) {
    if (['none', 'track', 'queue'].includes(mode)) {
      this.loopModes.set(guildId, mode);
      console.log(`🔁 Loop mode for guild ${guildId} set to: ${mode}`);
      return true;
    }
    return false;
  }

  // Move a track from a given index to the front of the queue
  moveTrack(guildId, fromIndex, toIndex = 0) {
    const queue = this.queues.get(guildId);
    if (queue && fromIndex >= 0 && fromIndex < queue.length) {
      const [track] = queue.splice(fromIndex, 1);
      queue.splice(toIndex, 0, track);
      console.log(`🎶 Moved "${track.title}" in queue for guild ${guildId}`);
      return true;
    }
    return false;
  }

  // Get current queue
  getQueue(guildId) {
    return this.queues.get(guildId) || [];
  }

  // Get currently playing track
  getNowPlaying(guildId) {
    return this.nowPlaying.get(guildId);
  }

  // Skip current track
  skipTrack(guildId) {
    const process = this.streamProcesses.get(guildId);
    const player = this.players.get(guildId);

    // Kill the streaming process if it exists, which will trigger the 'finish' event
    if (process) {
      process.kill();
      this.streamProcesses.delete(guildId);
      // The player will stop automatically when the stream ends.
      // Calling player.stop() is redundant but safe.
      if (player) {
        player.stop();
      }
      return true;
    }
    
    if (player) {
      player.stop();
      return true;
    }
    return false;
  }

  // Pause/Resume playback
  togglePause(guildId) {
    const player = this.players.get(guildId);
    if (player) {
      if (player.state.status === AudioPlayerStatus.Playing) {
        player.pause();
        return 'paused';
      } else if (player.state.status === AudioPlayerStatus.Paused) {
        player.unpause();
        return 'resumed';
      }
    }
    return 'idle'; // Return 'idle' if not playing or paused
  }

  // Search for tracks
  async searchTracks(query, limit = 5) {
    return new Promise((resolve, reject) => {
      // For search, we'll use yt-dlp with a YouTube search URL
      // This is a workaround since yt-dlp doesn't have a direct search option
      const searchUrl = `ytsearch${limit}:${query}`;
      
      const ytdlp = spawn('yt-dlp', [
        '--format', 'bestaudio/best',
        '--dump-json',
        '--no-playlist',
        searchUrl
      ]);
      
      let stdout = '';
      let stderr = '';
      
      ytdlp.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ytdlp.on('close', (code) => {
        if (code === 0) {
          try {
            const lines = stdout.trim().split('\n').filter(line => line.trim());
            const results = lines.map(line => {
              try {
                const videoInfo = JSON.parse(line);
                return {
                  title: videoInfo.title || 'Unknown Title',
                  url: videoInfo.webpage_url || videoInfo.url,
                  duration: videoInfo.duration || 0,
                  thumbnail: videoInfo.thumbnail || null,
                  author: videoInfo.uploader || 'Unknown',
                };
              } catch (parseError) {
                console.error('Failed to parse video info:', parseError);
                return null;
              }
            }).filter(Boolean);
            
            resolve(results);
          } catch (parseError) {
            reject(new Error(`Failed to parse yt-dlp search results: ${parseError.message}`));
          }
        } else {
          reject(new Error(`yt-dlp search failed with code ${code}: ${stderr}`));
        }
      });
      
      ytdlp.on('error', (error) => {
        reject(new Error(`Failed to spawn yt-dlp for search: ${error.message}`));
      });
    });
  }

  // Get track info from URL
  async getTrackInfo(url) {
    return new Promise((resolve, reject) => {
      const ytdlp = spawn('yt-dlp', [
        '--format', 'bestaudio/best',
        '--dump-json',
        '--no-playlist',
        url
      ]);
      
      let stdout = '';
      let stderr = '';
      
      ytdlp.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ytdlp.on('close', (code) => {
        if (code === 0) {
          try {
            const videoInfo = JSON.parse(stdout);
            resolve({
              title: videoInfo.title || 'Unknown Title',
              url: videoInfo.webpage_url || videoInfo.url,
              duration: videoInfo.duration || 0,
              thumbnail: videoInfo.thumbnail || null,
              author: videoInfo.uploader || 'Unknown',
            });
          } catch (parseError) {
            reject(new Error(`Failed to parse yt-dlp output: ${parseError.message}`));
          }
        } else {
          reject(new Error(`yt-dlp failed with code ${code}: ${stderr}`));
        }
      });
      
      ytdlp.on('error', (error) => {
        reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
      });
    });
  }
}

module.exports = MusicManager;
