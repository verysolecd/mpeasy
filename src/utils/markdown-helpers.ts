/**
 * Counts Chinese characters and English words in a given text.
 * @param text The plain text to analyze.
 * @returns An object containing the word count and character count.
 */
export function countWordsAndChars(text: string): { words: number; chars: number } {
    // 移除 Markdown 格式和 HTML 标签
    const cleanText = text
        .replace(/(\s----?\s*)/g, '') // ---
        .replace(/[`~@#$%^&*()_|+\-=\s!?<>{}【】\[\]\;'",.\/]/gi, '')

    // 统计中文字符
    const chineseChars = cleanText.match(/[一-龥]/g) || [];
    const charCount = chineseChars.length;

    // 统计英文单词
    const englishWords = cleanText.match(/[a-zA-Z0-9]+/g) || [];
    const wordCount = englishWords.length;

    return {
        words: wordCount,
        chars: charCount,
    };
}
