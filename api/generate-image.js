// POST /api/generate-image
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ success: false, error: 'Prompt is required' });
        }

        // Libreng Image Generator na hindi nangangailangan ng paid Google billing
        const cleanPrompt = encodeURIComponent(prompt.trim());
        const seed = Math.floor(Math.random() * 1000000);
        // Gumagamit ng high quality free model (Pollinations / Flux / Turbo)
        const imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?seed=${seed}&width=1024&height=1024&nologo=true`;

        return res.json({
            success: true,
            imageUrl: imageUrl
        });
    } catch (err) {
        console.error('Image Generation Error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});
