function wantsImageGeneration(text = '') {
  return /\b(generate|create|make|draw|design)\b.*\b(image|picture|photo|wallpaper|poster|logo|art|illustration)\b/i.test(text) || /\b(image|picture|photo|wallpaper|poster|logo|art|illustration)\b.*\b(generate|create|make|draw|design)\b/i.test(text);
}

function cleanImagePrompt(text = '') {
  return text
    .replace(/^(please\s+)?(generate|create|make|draw|design)\s+(an?|the)?\s*/i, '')
    .replace(/\b(image|picture|photo|wallpaper|poster|art|illustration)\s+(of|for)?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildImageMarkdown(text = '') {
  if (!wantsImageGeneration(text)) return null;

  const prompt = cleanImagePrompt(text) || text.trim();
  const enhancedPrompt = `${prompt}, high quality, detailed, visually appealing, professional composition`;
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&model=flux&nologo=true&private=true&seed=${Date.now()}`;

  return [
    `Here is your generated image for: **${prompt}**`,
    '',
    `![Generated image: ${prompt}](${imageUrl})`,
    '',
    `[Open image](${imageUrl})`,
  ].join('\n');
}

module.exports = { wantsImageGeneration, buildImageMarkdown };
