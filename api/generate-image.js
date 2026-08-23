// Frontend Handler (e.g., inside your submit/click event listener)
async function generateImage(promptText) {
  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: promptText }),
    });

    // 1. Kunin muna ang raw text mula sa response
    const rawText = await response.text();

    // 2. Suriin kung blangko ang nakuha mula sa server
    if (!rawText) {
      throw new Error(`Server returned empty response (Status: ${response.status})`);
    }

    // 3. I-parse ang text sa JSON nang may safe try-catch
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      throw new Error(`Server error (${response.status}): ${rawText.substring(0, 100)}`);
    }

    // 4. Suriin ang API result status
    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    // Tagumpay: gamitin ang imageUrl
    console.log("Image URL:", data.imageUrl);
    return data.imageUrl;

  } catch (error) {
    console.error("Fetch Error:", error);
    // Ipapakita na ngayon ang totoong dahilan sa UI imbes na 'Unexpected end of JSON input'
    showErrorToUser(error.message); 
  }
}
