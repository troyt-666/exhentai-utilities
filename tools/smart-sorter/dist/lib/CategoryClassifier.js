import { ArchiveAnalyzer } from './ArchiveAnalyzer.js';
import { GeminiClient } from './GeminiClient.js';
export class CategoryClassifier {
    config;
    analyzer;
    geminiClient;
    constructor(config, geminiApiKey) {
        this.config = config;
        this.analyzer = new ArchiveAnalyzer();
        if (geminiApiKey) {
            this.geminiClient = new GeminiClient(geminiApiKey, config.gemini);
        }
    }
    async classifyArchive(archive) {
        // First try rule-based classification
        const ruleResult = this.classifyByRules(archive);
        if (!ruleResult.isAmbiguous) {
            return ruleResult;
        }
        // If ambiguous and AI is available, use Gemini
        if (this.geminiClient) {
            try {
                const aiResult = await this.geminiClient.classifyArchive(archive);
                return this.convertGeminiResult(aiResult, archive);
            }
            catch (error) {
                console.warn(`AI classification failed for ${archive.filename}, falling back to rule-based result`);
            }
        }
        // Fall back to rule-based result
        return ruleResult;
    }
    classifyByRules(archive) {
        // Sort categories by priority
        const sortedCategories = Object.entries(this.config.categories)
            .sort(([, a], [, b]) => a.priority - b.priority);
        for (const [categoryName, rule] of sortedCategories) {
            if (rule.default)
                continue; // Skip default category for now
            const match = this.matchesRule(archive, rule);
            if (match.matches) {
                const subdirectory = this.extractSubdirectory(archive, categoryName, rule);
                return {
                    category: categoryName,
                    confidence: match.confidence,
                    reason: match.reason,
                    subdirectory: this.analyzer.sanitizeName(subdirectory),
                    isAmbiguous: match.confidence < this.config.options.confirmationThreshold
                };
            }
        }
        // Fall back to default category
        const defaultCategory = Object.entries(this.config.categories)
            .find(([, rule]) => rule.default);
        if (defaultCategory) {
            const [categoryName, rule] = defaultCategory;
            const subdirectory = this.extractSubdirectory(archive, categoryName, rule);
            return {
                category: categoryName,
                confidence: 0.5,
                reason: 'Default category assignment',
                subdirectory: this.analyzer.sanitizeName(subdirectory),
                isAmbiguous: true
            };
        }
        throw new Error('No default category configured');
    }
    matchesRule(archive, rule) {
        const { filename, tags } = archive;
        // Check excluded tags first
        if (rule.excludeTags) {
            for (const excludeTag of rule.excludeTags) {
                if (tags.includes(excludeTag)) {
                    return { matches: false, confidence: 0, reason: `Excluded by tag: ${excludeTag}` };
                }
            }
        }
        // Check required tags
        if (rule.tags) {
            const matchingTags = rule.tags.filter(tag => tags.includes(tag));
            if (matchingTags.length > 0) {
                return {
                    matches: true,
                    confidence: 0.9,
                    reason: `Matched tags: ${matchingTags.join(', ')}`
                };
            }
        }
        // Check filename patterns
        if (rule.patterns) {
            for (const pattern of rule.patterns) {
                const regex = new RegExp(pattern, 'i');
                if (regex.test(filename)) {
                    return {
                        matches: true,
                        confidence: 0.8,
                        reason: `Matched filename pattern: ${pattern}`
                    };
                }
            }
        }
        return { matches: false, confidence: 0, reason: 'No matching criteria' };
    }
    extractSubdirectory(archive, categoryName, _rule) {
        const { filename } = archive;
        switch (categoryName) {
            case '杂志':
                return this.extractMagazineDirectory(filename);
            case '图集':
                return this.extractArtistDirectory(filename);
            case '猎奇':
            case '单行本':
            case '短篇':
                return this.extractAuthorDirectory(archive, _rule);
            default:
                return this.extractAuthorDirectory(archive, _rule);
        }
    }
    extractMagazineDirectory(filename) {
        const magazineName = this.analyzer.extractMagazineFromFilename(filename);
        return magazineName || '未知杂志';
    }
    extractArtistDirectory(filename) {
        const artistName = this.analyzer.extractArtistFromFilename(filename);
        return artistName || '未知作者';
    }
    extractAuthorDirectory(archive, _rule) {
        const { filename, tags } = archive;
        // For goudoushi, prefer circle name
        const preferCircle = tags.includes('other:goudoushi');
        const { author, circle } = this.analyzer.extractAuthorFromFilename(filename);
        if (preferCircle && circle) {
            return circle;
        }
        return author || circle || '未知作者';
    }
    convertGeminiResult(geminiResult, _archive) {
        return {
            category: geminiResult.category,
            confidence: geminiResult.confidence,
            reason: `AI classification: ${geminiResult.reasoning}`,
            subdirectory: this.analyzer.sanitizeName(geminiResult.subdirectory),
            isAmbiguous: geminiResult.confidence < this.config.options.confirmationThreshold
        };
    }
    async batchClassify(archives) {
        const results = [];
        const ambiguousArchives = [];
        // First pass: rule-based classification
        for (let i = 0; i < archives.length; i++) {
            const archive = archives[i];
            const result = this.classifyByRules(archive);
            results.push(result);
            if (result.isAmbiguous && this.geminiClient) {
                ambiguousArchives.push({ archive, index: i });
            }
        }
        // Second pass: AI classification for ambiguous cases
        if (ambiguousArchives.length > 0 && this.geminiClient) {
            console.log(`Using AI to classify ${ambiguousArchives.length} ambiguous archives...`);
            try {
                const aiResults = await this.geminiClient.batchClassify(ambiguousArchives.map(item => item.archive), this.config.options.batchSize);
                // Replace ambiguous results with AI results
                for (let i = 0; i < ambiguousArchives.length; i++) {
                    const { index } = ambiguousArchives[i];
                    const aiResult = aiResults[i];
                    results[index] = this.convertGeminiResult(aiResult, ambiguousArchives[i].archive);
                }
            }
            catch (error) {
                console.warn('Batch AI classification failed, keeping rule-based results');
            }
        }
        return results;
    }
    getCategories() {
        return Object.keys(this.config.categories);
    }
    getCategoryRule(categoryName) {
        return this.config.categories[categoryName];
    }
}
//# sourceMappingURL=CategoryClassifier.js.map