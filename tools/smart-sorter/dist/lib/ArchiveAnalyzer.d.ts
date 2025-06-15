import { ArchiveInfo } from '../types/index.js';
export declare class ArchiveAnalyzer {
    analyzeArchive(archivePath: string): Promise<ArchiveInfo>;
    private extractGalleryInfo;
    private parseTags;
    private parseMetadata;
    extractAuthorFromFilename(filename: string): {
        author?: string;
        circle?: string;
    };
    extractMagazineFromFilename(filename: string): string | null;
    extractArtistFromFilename(filename: string): string | null;
    sanitizeName(name: string): string;
}
//# sourceMappingURL=ArchiveAnalyzer.d.ts.map