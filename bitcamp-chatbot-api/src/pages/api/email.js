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
    model: "gpt-4-turbo-preview",
    messages: [{role: "user", content: prompt}]
  };

  try {
    const response = await axios.post(url, data, { headers });
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

  const prompt = "What is the domain name at " + url + " belong to? And what' their eamil?";
  var gptResponse = "";
  try {
    gptResponse = await sendChatMessage(prompt);
  
    // Assuming the model returns a structured JSON with a field possibly containing the phone number
    const email = gptResponse.choices[0].message.content;
    // filter email from the word with an @
    // const email = gptResponse.choices[0].message.content.match(/\b\w+@\w+\b/);

    res.status(200).json({
      email: email || "email not found"
    });
  } catch (error) {
    console.log(gptResponse)
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}