const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { parseStream } = require('music-metadata');
const { Readable } = require('stream');

class S3Service {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    
    this.bucketName = process.env.S3_BUCKET_NAME;
    this.prefix = process.env.S3_BUCKET_PREFIX || 'music/';
    
    // Cache for metadata to avoid repeated extraction
    this.metadataCache = new Map();
    
    // Supported audio file extensions
    this.audioExtensions = [
      '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.opus',
      '.aac', '.mp4', '.webm', '.mkv', '.3gp', '.amr'
    ];
  }

  /**
   * Check if a file is an audio file based on extension
   */
  isAudioFile(key) {
    const lowerKey = key.toLowerCase();
    return this.audioExtensions.some(ext => lowerKey.endsWith(ext));
  }

  /**
   * List all audio files in the S3 bucket
   */
  async listAudioFiles() {
    if (!this.bucketName) {
      throw new Error('S3_BUCKET_NAME environment variable is not set');
    }

    const files = [];
    let continuationToken = null;

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: this.prefix,
        ContinuationToken: continuationToken,
      });

      const response = await this.s3Client.send(command);
      
      if (response.Contents) {
        for (const object of response.Contents) {
          const key = object.Key;
          if (this.isAudioFile(key)) {
            files.push({
              key,
              size: object.Size,
              lastModified: object.LastModified,
              filename: key.split('/').pop(),
            });
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return files;
  }

  /**
   * Generate a presigned URL for accessing an S3 object
   */
  async getPresignedUrl(key, expirationSeconds = 3600) {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn: expirationSeconds });
  }

  /**
   * Extract metadata from an audio file
   */
  async extractMetadata(key) {
    // Check cache first
    if (this.metadataCache.has(key)) {
      const cached = this.metadataCache.get(key);
      // Check if cache is still valid (1 hour)
      if (Date.now() - cached.timestamp < 3600000) {
        return cached.metadata;
      }
    }

    try {
      // Get the object stream from S3
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('No body returned from S3');
      }

      // Handle different stream types from AWS SDK v3
      // In Node.js environments, response.Body is typically an IncomingMessage (Node.js stream)
      // In browser/Web environments, it might be a Web Streams ReadableStream
      let stream;
      
      // Check if it's already a Node.js stream (has pipe method or is Readable)
      if (response.Body.pipe || response.Body instanceof Readable) {
        // It's already a Node.js stream (IncomingMessage or other Readable)
        stream = response.Body;
      } else {
        // It's likely a Web Streams ReadableStream, convert it
        stream = Readable.fromWeb(response.Body);
      }

      // Parse metadata
      const metadata = await parseStream(stream);

      // Extract relevant information
      const result = {
        title: metadata.common.title || key.split('/').pop().replace(/\.[^/.]+$/, ''),
        artist: metadata.common.artist || 'Unknown Artist',
        album: metadata.common.album || null,
        duration: metadata.format.duration ? Math.round(metadata.format.duration) : null,
      };

      // Cache the result
      this.metadataCache.set(key, {
        metadata: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error(`Error extracting metadata for ${key}:`, error);
      // Return fallback metadata
      const filename = key.split('/').pop().replace(/\.[^/.]+$/, '');
      return {
        title: filename,
        artist: 'Unknown Artist',
        album: null,
        duration: null,
      };
    }
  }

  /**
   * Get all audio files with their metadata
   */
  async getAudioFilesWithMetadata() {
    const files = await this.listAudioFiles();
    
    // Extract metadata for all files (in parallel)
    const filesWithMetadata = await Promise.all(
      files.map(async (file) => {
        const metadata = await this.extractMetadata(file.key);
        const presignedUrl = await this.getPresignedUrl(file.key);
        
        return {
          key: file.key,
          filename: file.filename,
          url: presignedUrl,
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.album,
          duration: metadata.duration,
          size: file.size,
          lastModified: file.lastModified,
        };
      })
    );

    return filesWithMetadata;
  }

  /**
   * Search, filter, and sort files
   */
  async getFiles(options = {}) {
    const { search = '', sort = 'title', order = 'asc', filterArtist = '', filterAlbum = '' } = options;
    
    let files = await this.getAudioFilesWithMetadata();
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      files = files.filter(file => 
        file.title.toLowerCase().includes(searchLower) ||
        file.artist.toLowerCase().includes(searchLower) ||
        file.album?.toLowerCase().includes(searchLower) ||
        file.filename.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply artist filter
    if (filterArtist) {
      files = files.filter(file => 
        file.artist.toLowerCase() === filterArtist.toLowerCase()
      );
    }
    
    // Apply album filter
    if (filterAlbum) {
      files = files.filter(file => 
        file.album?.toLowerCase() === filterAlbum.toLowerCase()
      );
    }
    
    // Sort files
    files.sort((a, b) => {
      let aValue, bValue;
      
      switch (sort) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'artist':
          aValue = a.artist.toLowerCase();
          bValue = b.artist.toLowerCase();
          break;
        case 'album':
          aValue = (a.album || '').toLowerCase();
          bValue = (b.album || '').toLowerCase();
          break;
        case 'duration':
          aValue = a.duration || 0;
          bValue = b.duration || 0;
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }
      
      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });
    
    return files;
  }

  /**
   * Get a track object for a specific S3 file key
   */
  async getTrack(key) {
    const metadata = await this.extractMetadata(key);
    const presignedUrl = await this.getPresignedUrl(key);
    
    return {
      title: metadata.title,
      url: presignedUrl,
      duration: metadata.duration || 0,
      author: metadata.artist,
      album: metadata.album,
      source: 's3',
      thumbnail: null,
    };
  }
}

module.exports = S3Service;

