const { AudioPlayer, AudioPlayerStatus, createAudioResource, joinVoiceChannel } = require('@discordjs/voice');
const { spawn } = require('child_process');

class MusicManager {
  constructor() {
    this.players = new Map();
    this.queues = new Map();
    this.nowPlaying = new Map();
    this.connections = new Map();
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

      // Create audio resource from the ytdlp stdout stream
      const resource = createAudioResource(ytdlp.stdout, {
        inlineVolume: true,
      });
      
      console.log('🔧 Audio resource created from direct stream.');

      // Attach event listeners directly to the resource for this specific track
      resource.playStream.on('start', () => {
        const currentTrack = this.nowPlaying.get(guildId);
        if (currentTrack) {
          console.log(`▶️ Started playing: ${currentTrack.title}`);
        }
      });

      resource.playStream.on('finish', () => {
        const currentTrack = this.nowPlaying.get(guildId);
        if (currentTrack) {
          console.log(`⏹️ Finished playing: ${currentTrack.title}`);
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
      });

      resource.playStream.on('close', () => {
        console.log('⏹️ Audio stream closed.');
      });

      resource.playStream.on('error', error => {
        console.error('❌ Audio resource stream error:', error);
        const queue = this.queues.get(guildId);
        if (queue && queue.length > 0) {
          this.playNext(guildId);
        }
      });
      
      // Log any errors from the ytdlp process itself
      ytdlp.stderr.on('data', (data) => {
        console.error(`yt-dlp stderr: ${data}`);
      });

      player.play(resource);
      console.log(`🎵 Playing: ${track.title}`);

    } catch (error) {
      console.error('Error playing track:', error);
      throw new Error('Failed to play track. Please try again.');
    }
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
    const player = this.players.get(guildId);
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
    return false;
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
