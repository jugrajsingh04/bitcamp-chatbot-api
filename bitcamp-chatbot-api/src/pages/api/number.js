const axios = require('axios');

const apiKey = 's'+'k-'+'pro'+'j-o9gEXbYpRLElql9eQ3L9T3BlbkFJNpERazGqwj3YUKu8rDNj'
// Function to send a request to the OpenAI API
async function sendChatMessage(prompt) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };
  const data = {
    model: "gpt-4",
    messages: [{role: "user", content: prompt}],
    temperature: 0.7
  };

  try {
    const response = await axios.post(url, data, { headers });
    console.log("Response from GPT:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error in making request:", error);
  }
}

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  const prompt = `what is the customer service phone number from the website: ${url}`;

  try {
    const gptResponse = await sendChatMessage(prompt);
    console.log("GPT Response:", gptResponse.choices[0].message.content);

    // Assuming the model returns a structured JSON with a field possibly containing the phone number
    const phone = gptResponse.choices[0].message.content.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/);
    res.status(200).json({
      phone_number: phone || "not found"
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}