import inquirer from 'inquirer';
import chalk from 'chalk';
export class InteractiveSorter {
    operations = [];
    addOperation(operation) {
        this.operations.push(operation);
    }
    addOperations(operations) {
        this.operations.push(...operations);
    }
    groupIntoBatches() {
        const batches = new Map();
        for (const operation of this.operations) {
            const { classification } = operation;
            let batchKey = '';
            let batchType = 'category';
            // Group by category and subdirectory
            if (classification.category === '杂志') {
                batchKey = `magazine:${classification.subdirectory}`;
                batchType = 'magazine';
            }
            else if (classification.category === '图集') {
                batchKey = `artist:${classification.subdirectory}`;
                batchType = 'artist';
            }
            else {
                batchKey = `category:${classification.category}:${classification.subdirectory}`;
                batchType = 'category';
            }
            if (!batches.has(batchKey)) {
                batches.set(batchKey, {
                    id: batchKey,
                    type: batchType,
                    pattern: this.getBatchDisplayPattern(classification),
                    operations: [],
                    confirmed: false
                });
            }
            batches.get(batchKey).operations.push(operation);
        }
        return Array.from(batches.values()).sort((a, b) => b.operations.length - a.operations.length);
    }
    getBatchDisplayPattern(classification) {
        switch (classification.category) {
            case '杂志':
                return `${classification.category}/${classification.subdirectory}`;
            case '图集':
                return `${classification.category}/${classification.subdirectory}`;
            default:
                return `${classification.category}/${classification.subdirectory}`;
        }
    }
    async interactiveConfirmation() {
        const batches = this.groupIntoBatches();
        const confirmedOperations = [];
        console.log(chalk.cyan(`\n📊 Found ${this.operations.length} archives to sort in ${batches.length} groups\n`));
        for (const batch of batches) {
            await this.confirmBatch(batch);
            if (batch.confirmed) {
                confirmedOperations.push(...batch.operations);
            }
        }
        return confirmedOperations;
    }
    async confirmBatch(batch) {
        console.log(chalk.yellow(`\n📁 ${batch.pattern} (${batch.operations.length} files)`));
        // Show confidence levels
        const confidenceLevels = batch.operations.map(op => op.classification.confidence);
        const avgConfidence = confidenceLevels.reduce((a, b) => a + b, 0) / confidenceLevels.length;
        const minConfidence = Math.min(...confidenceLevels);
        console.log(chalk.gray(`   Confidence: avg ${(avgConfidence * 100).toFixed(1)}%, min ${(minConfidence * 100).toFixed(1)}%`));
        // Show sample files
        const sampleCount = Math.min(3, batch.operations.length);
        const samples = batch.operations.slice(0, sampleCount);
        for (const sample of samples) {
            const confidence = (sample.classification.confidence * 100).toFixed(0);
            const confidenceColor = sample.classification.confidence > 0.8 ? chalk.green :
                sample.classification.confidence > 0.5 ? chalk.yellow : chalk.red;
            console.log(`   ${confidenceColor(`${confidence}%`)} ${sample.archive.filename}`);
        }
        if (batch.operations.length > sampleCount) {
            console.log(chalk.gray(`   ... and ${batch.operations.length - sampleCount} more files`));
        }
        const choices = [
            { name: '✅ Confirm all files in this group', value: 'confirm' },
            { name: '👀 Review files individually', value: 'review' },
            { name: '❌ Skip this entire group', value: 'skip' }
        ];
        if (minConfidence < 0.6) {
            choices.splice(1, 0, { name: '🤖 Show AI reasoning for low confidence files', value: 'reasoning' });
        }
        const { action } = await inquirer.prompt([{
                type: 'list',
                name: 'action',
                message: 'What would you like to do with this group?',
                choices
            }]);
        switch (action) {
            case 'confirm':
                batch.confirmed = true;
                console.log(chalk.green(`✅ Confirmed ${batch.operations.length} files for ${batch.pattern}`));
                break;
            case 'review':
                await this.reviewBatchIndividually(batch);
                break;
            case 'reasoning':
                await this.showReasoningAndConfirm(batch);
                break;
            case 'skip':
                console.log(chalk.red(`❌ Skipped ${batch.operations.length} files from ${batch.pattern}`));
                break;
        }
    }
    async reviewBatchIndividually(batch) {
        console.log(chalk.cyan(`\n🔍 Reviewing ${batch.operations.length} files individually...\n`));
        let confirmedCount = 0;
        for (let i = 0; i < batch.operations.length; i++) {
            const operation = batch.operations[i];
            const { archive, classification } = operation;
            console.log(chalk.white(`\n[${i + 1}/${batch.operations.length}] ${archive.filename}`));
            console.log(chalk.gray(`   Category: ${classification.category}`));
            console.log(chalk.gray(`   Directory: ${classification.subdirectory}`));
            console.log(chalk.gray(`   Confidence: ${(classification.confidence * 100).toFixed(1)}%`));
            console.log(chalk.gray(`   Reason: ${classification.reason}`));
            if (archive.tags.length > 0) {
                console.log(chalk.gray(`   Tags: ${archive.tags.slice(0, 5).join(', ')}${archive.tags.length > 5 ? '...' : ''}`));
            }
            const { confirm } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Move this file?',
                    default: classification.confidence > 0.7
                }]);
            if (confirm) {
                operation.status = 'confirmed';
                confirmedCount++;
            }
            else {
                operation.status = 'skipped';
            }
        }
        batch.confirmed = confirmedCount > 0;
        console.log(chalk.green(`\n✅ Confirmed ${confirmedCount} out of ${batch.operations.length} files`));
    }
    async showReasoningAndConfirm(batch) {
        const lowConfidenceOps = batch.operations.filter(op => op.classification.confidence < 0.6);
        console.log(chalk.cyan(`\n🤖 AI Reasoning for ${lowConfidenceOps.length} low confidence files:\n`));
        for (const operation of lowConfidenceOps) {
            const { archive, classification } = operation;
            console.log(chalk.white(`📄 ${archive.filename}`));
            console.log(chalk.yellow(`   ${classification.reason}`));
            console.log('');
        }
        const { action } = await inquirer.prompt([{
                type: 'list',
                name: 'action',
                message: 'After reviewing the reasoning, what would you like to do?',
                choices: [
                    { name: '✅ Confirm all files anyway', value: 'confirm' },
                    { name: '👀 Review each file individually', value: 'review' },
                    { name: '❌ Skip this group', value: 'skip' }
                ]
            }]);
        switch (action) {
            case 'confirm':
                batch.confirmed = true;
                break;
            case 'review':
                await this.reviewBatchIndividually(batch);
                break;
            case 'skip':
                batch.confirmed = false;
                break;
        }
    }
    async quickConfirmationMode() {
        const batches = this.groupIntoBatches();
        const confirmedOperations = [];
        console.log(chalk.cyan(`\n⚡ Quick confirmation mode - ${this.operations.length} archives in ${batches.length} groups\n`));
        for (const batch of batches) {
            const avgConfidence = batch.operations.reduce((sum, op) => sum + op.classification.confidence, 0) / batch.operations.length;
            console.log(chalk.yellow(`📁 ${batch.pattern} (${batch.operations.length} files, ${(avgConfidence * 100).toFixed(1)}% confidence)`));
            const { confirm } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Confirm this group?',
                    default: avgConfidence > 0.7
                }]);
            if (confirm) {
                batch.confirmed = true;
                confirmedOperations.push(...batch.operations);
                console.log(chalk.green(`✅ Confirmed`));
            }
            else {
                console.log(chalk.red(`❌ Skipped`));
            }
        }
        return confirmedOperations;
    }
    displaySummary(operations) {
        if (operations.length === 0) {
            console.log(chalk.yellow('\n⚠️  No operations confirmed'));
            return;
        }
        console.log(chalk.cyan(`\n📋 Summary: ${operations.length} files ready to sort\n`));
        const categoryCounts = new Map();
        operations.forEach(op => {
            const category = op.classification.category;
            categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
        });
        for (const [category, count] of categoryCounts.entries()) {
            console.log(chalk.white(`   ${category}: ${count} files`));
        }
        console.log('');
    }
}
//# sourceMappingURL=InteractiveSorter.js.map