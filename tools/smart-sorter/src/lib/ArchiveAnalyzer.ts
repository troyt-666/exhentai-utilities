import yauzl from 'yauzl';
import path from 'path';
import { ArchiveInfo } from '../types/index.js';

export class ArchiveAnalyzer {

  async analyzeArchive(archivePath: string): Promise<ArchiveInfo> {
    const filename = path.basename(archivePath);
    const archiveInfo: ArchiveInfo = {
      filename,
      path: archivePath,
      tags: [],
      metadata: {}
    };

    try {
      // Extract galleryinfo.txt from the archive
      const galleryInfo = await this.extractGalleryInfo(archivePath);
      if (galleryInfo) {
        archiveInfo.tags = this.parseTags(galleryInfo);
        const metadata = this.parseMetadata(galleryInfo);
        if (metadata) {
          archiveInfo.metadata = metadata;
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not analyze ${filename}:`, error instanceof Error ? error.message : 'Unknown error');
    }

    return archiveInfo;
  }

  private async extractGalleryInfo(archivePath: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      yauzl.open(archivePath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(err);
          return;
        }

        let found = false;
        let galleryInfo = '';

        zipfile.readEntry();

        zipfile.on('entry', (entry) => {
          const entryName = entry.fileName.toLowerCase();
          
          // Look for galleryinfo.txt in any directory within the archive
          if (entryName.endsWith('/galleryinfo.txt') || entryName === 'galleryinfo.txt') {
            found = true;
            
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                reject(err);
                return;
              }

              const chunks: Buffer[] = [];
              readStream.on('data', (chunk) => chunks.push(chunk));
              readStream.on('end', () => {
                galleryInfo = Buffer.concat(chunks).toString('utf8');
                zipfile.close();
                resolve(galleryInfo);
              });
              readStream.on('error', reject);
            });
          } else {
            zipfile.readEntry();
          }
        });

        zipfile.on('end', () => {
          if (!found) {
            zipfile.close();
            resolve(null);
          }
        });

        zipfile.on('error', reject);
      });
    });
  }

  private parseTags(galleryInfo: string): string[] {
    const tagsMatch = galleryInfo.match(/^Tags:\s*(.+)$/m);
    if (!tagsMatch) return [];

    return tagsMatch[1]
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }

  private parseMetadata(galleryInfo: string): ArchiveInfo['metadata'] | undefined {
    const metadata: NonNullable<ArchiveInfo['metadata']> = {};

    // Parse various metadata fields
    const patterns = {
      title: /^Title:\s*(.+)$/m,
      uploader: /^Uploader:\s*(.+)$/m,
      category: /^Category:\s*(.+)$/m,
      language: /^Language:\s*(.+)$/m
    };

    let hasAnyMetadata = false;
    for (const [field, pattern] of Object.entries(patterns)) {
      const match = galleryInfo.match(pattern);
      if (match) {
        (metadata as any)[field] = match[1].trim();
        hasAnyMetadata = true;
      }
    }

    return hasAnyMetadata ? metadata : undefined;
  }

  extractAuthorFromFilename(filename: string): { author?: string; circle?: string; isCollaboration?: boolean; fullCollaboration?: string } {
    // Remove .zip extension
    const cleanName = filename.replace(/\.zip$/i, '');

    // Pattern: [circle(author)]title or [circle (author)]title
    const circleAuthorMatch = cleanName.match(/^\[([^(]+?)\s*\(([^)]+)\)\]/);
    if (circleAuthorMatch) {
      const circlePart = circleAuthorMatch[1].trim();
      const authorPart = circleAuthorMatch[2].trim();
      
      // Check for collaboration markers
      const isCollaboration = circlePart.includes('、') || circlePart.includes('&') || 
                              authorPart.includes('、') || authorPart.includes('&');
      
      if (isCollaboration) {
        // Use first circle/author name + collaboration marker
        const primaryCircle = circlePart.split(/[、&]/)[0].trim();
        return {
          circle: `${primaryCircle} (合作)`,
          author: authorPart,
          isCollaboration: true,
          fullCollaboration: `${circlePart} (${authorPart})`
        };
      }
      
      return {
        circle: circlePart,
        author: authorPart
      };
    }

    // Pattern: (event)[circle(author)]title
    const eventCircleAuthorMatch = cleanName.match(/^\([^)]+\)\[([^(]+?)\s*\(([^)]+)\)\]/);
    if (eventCircleAuthorMatch) {
      const circlePart = eventCircleAuthorMatch[1].trim();
      const authorPart = eventCircleAuthorMatch[2].trim();
      
      // Check for collaboration markers
      const isCollaboration = circlePart.includes('、') || circlePart.includes('&') || 
                              authorPart.includes('、') || authorPart.includes('&');
      
      if (isCollaboration) {
        const primaryCircle = circlePart.split(/[、&]/)[0].trim();
        return {
          circle: `${primaryCircle} (合作)`,
          author: authorPart,
          isCollaboration: true,
          fullCollaboration: `${circlePart} (${authorPart})`
        };
      }
      
      return {
        circle: circlePart,
        author: authorPart
      };
    }

    // Pattern: [author]title or (event)[author]title - check for collaboration
    const authorMatch = cleanName.match(/^(?:\([^)]+\))?\[([^\]]+)\]/);
    if (authorMatch) {
      const authorPart = authorMatch[1].trim();
      
      // Check for collaboration in author field
      if (authorPart.includes('、') || authorPart.includes('&')) {
        const primaryAuthor = authorPart.split(/[、&]/)[0].trim();
        return {
          author: `${primaryAuthor} (合作)`,
          isCollaboration: true,
          fullCollaboration: authorPart
        };
      }
      
      return {
        author: authorPart
      };
    }

    return {};
  }

  extractMagazineFromFilename(filename: string): string | null {
    const cleanName = filename.replace(/\.zip$/i, '');

    // Pattern: [アンソロジー] Magazine Name Vol.XX
    const anthologyMatch = cleanName.match(/^\[アンソロジー\]\s*([^[\]]+)/);
    if (anthologyMatch) {
      return anthologyMatch[1].trim().split(/\s+Vol\./)[0];
    }

    // Pattern: COMIC MAGAZINE_NAME YEAR年X月号
    const comicMatch = cleanName.match(/^(COMIC\s+[A-Z]+)/);
    if (comicMatch) {
      return comicMatch[1];
    }

    // Pattern: Magazine Name Vol.XX or Magazine Name 202X年X月号
    const magazineMatch = cleanName.match(/^([^[\]]+?)\s+(?:Vol\.\d+|\d{4}年\d+月号)/);
    if (magazineMatch) {
      return magazineMatch[1].trim();
    }

    return null;
  }

  extractArtistFromFilename(filename: string): string | null {
    const cleanName = filename.replace(/\.zip$/i, '');

    // Pattern: [Pixiv] artist (ID)
    const pixivMatch = cleanName.match(/^\[Pixiv\]\s*([^(]+?)\s*\(/);
    if (pixivMatch) {
      return pixivMatch[1].trim();
    }

    // Pattern: [Fanbox] artist (~date) or [Fanbox] artist [ID]
    const fanboxMatch = cleanName.match(/^\[(?:Fanbox|FANBOX)\](?:\[Pixiv\])?\s*([^|\[~(]+?)(?:\s*[~(]|\s*\[|$)/);
    if (fanboxMatch) {
      return fanboxMatch[1].trim();
    }

    // Pattern: [FANBOX + Twitter] artist (YEAR ~ YEAR)
    const socialMatch = cleanName.match(/^\[(?:FANBOX|Twitter|Patreon)[^]]*\]\s*([^(]+?)\s*(?:\(|$)/);
    if (socialMatch) {
      return socialMatch[1].trim();
    }

    return null;
  }

  sanitizeName(name: string): string {
    return name
      .replace(/[/\\:*?"<>|]/g, '_')
      .replace(/\s+/g, ' ')
      .trim();
  }
}