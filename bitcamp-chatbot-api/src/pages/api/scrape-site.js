const express = require('express');
export const config = {
    maxDuration: 300
}; // This function can run for a maximum of 5 seconds

// Global browser instance
let browser;

const router = express.Router();

export default async function handler(req, res) {
    const url = req.query.url;

    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        const apiKey = 's'+'k-'+'pro'+'j-o9gEXbYpRLElql9eQ3L9T3BlbkFJNpERazGqwj3YUKu8rDNj';

        // a vcStore exists already

        const vcStore = await find_vector(`${url}VectorStore`,apiKey);
        if (vcStore) {
            console.log('Vector store found:', vcStore);

            const assistant = await find_assistant(vcStore.id,apiKey);
            if (assistant) {
                console.log('Assistant found:', assistant);
                return res.status(200).json({ assistantId: assistant.id });
            }
            else {
                console.log('Assistant not found for vector store:', vcStore);
            }

        }
        else {
            console.log('Vector store not found:', vcStore);
        }




        console.log('Scraping:', url);
        const result = await scrape(url);  // Make sure scrape function is defined or imported
        //res.status(200).send(result);
        console.log('Result:', result);
        const blob = new Blob([result.join("\n")], { type: 'text/plain' });
        console.log('Blob:', blob);

    // Step 2: Create a FormData object to append your file and the purpose
    const formData = new FormData();
    formData.append('file', blob, "fileee.txt");//`${url}.txt`); // Adjust the filename as needed
    formData.append('purpose', 'assistants'); // Use 'assistants' or 'fine-tune' based on your requirement

    // Step 3: Make the Fetch request to upload the file
    const fileUploadResponse = await fetch('https://api.openai.com/v1/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
                // 'Content-Type' is set automatically by FormData
            },
            body: formData
        });

    const fileData = await fileUploadResponse.json();
    console.log('File upload response:', fileUploadResponse);
    if (!fileUploadResponse.ok) {
        throw new Error(`Failed to upload file: ${fileData.error}`);

    }

    console.log('File upload success:', fileData.id);


    const vcStoreResponse = await fetch('https://api.openai.com/v1/vector_stores', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
            name: `${url}VectorStore`,
            file_ids: [fileData.id]
        })
    });

    const vcStoreData = await vcStoreResponse.json();  // Parse the JSON response
    // console.log('HTTP Status:', vcStoreResponse.status);  // Log the HTTP status code
    // console.log('Response Headers:', vcStoreResponse.headers);  // Log response headers for debugging
    console.log('Response Body:', vcStoreData);  // Log the response body

    if (!vcStoreResponse.ok) {
        throw new Error(`Failed to create vector store: ${vcStoreData.error}, Status: ${vcStoreResponse.status}`);
    }


    let status = await checkVectorSpaceStatus(vcStoreData.id,apiKey);
    while (status !== 'completed') {
        console.log('Vector space status:', status);
        status = await checkVectorSpaceStatus(vcStoreData.id,apiKey);
    }

        // Assistant creation
    const assistantResponse = await fetch('https://api.openai.com/v1/assistants', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'

        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            name: `${url}Assistant`,
            description: "An assistant to demonstrate GPT-3.5-turbo capabilities using Next.js",
            tool_resources: {
                file_search : {
                    vector_store_ids: [vcStoreData.id]
                }
            }  // Ensure this ID is valid and correctly assigned
        })
    });

    console.log('Assistant creation response:', assistantResponse);

    if (!assistantResponse.ok) {
        const errorData = await assistantResponse.json();
        throw new Error(`Assistant creation failed: ${errorData.error}, Status: ${assistantResponse.status}`);
    }

    const assistantData = await assistantResponse.json();
console.log('Assistant created successfully:', assistantData);

    res.status(200).json({ assistantId: assistantData.id});



    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}



async function checkVectorSpaceStatus(vectorSpaceId,apiKey) {
    const response = await fetch(`https://api.openai.com/v1/vector_stores/${vectorSpaceId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta' : 'assistants=v2'

        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch vector space status: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.status; // Assuming the status is returned in the response JSON
}

const axios = require('axios');
const cheerio = require('cheerio');

async function find_vector(name, apiKey) {
    try {
        const response = await axios.get('https://api.openai.com/v1/vector_stores', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            }
        });

        if (response.status !== 200) {
            throw new Error(`Failed to fetch vector stores. Status: ${response.status}`);
        }

        const vectorStores = response.data.data;
        const foundVector = vectorStores.find(store => store.name === name);

        return foundVector; // Returns undefined if not found
    } catch (error) {
        console.error('Error finding vector store:', error.message);
        throw error; // Re-throw the error for handling at higher level
    }
}


async function find_assistant(assistantId, apiKey) {
    try {
        const response = await axios.get('https://api.openai.com/v1/assistants', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            }
        });

        if (response.status !== 200) {
            throw new Error(`Failed to fetch assistants. Status: ${response.status}`);
        }

        const assistants = response.data.data;
        console.log('Assistants:', assistants);
        const foundAssistant = assistants.find(assistant => {
            const toolResources = assistant.tool_resources;
            if (toolResources && toolResources.file_search && toolResources.file_search.vector_store_ids) {
                return toolResources.file_search.vector_store_ids.includes(assistantId);
            }
            return false;
        });

        return foundAssistant; // Returns undefined if not found
    } catch (error) {
        console.error('Error finding assistant:', error.message);
        throw error; // Re-throw the error for handling at higher level
    }
}
async function scrape(url, num = 0, visited = new Set(), allText = []) {
    if (num >= 5) {
        return allText;
    }

    if (visited.has(url)) {
        return allText;
    }
    visited.add(url);

    try {
        const scrapingBeeApiKey = 'YG6SG2O3ES26IL897ZCGD5HIIJ9FXWPTUGBZUKQB9U323EMDBB6M5IKTW2U1FUAGZOS8L1DPZMYCMV1O';
        const scrapingBeeUrl = 'https://app.scrapingbee.com/api/v1/';
        
        const response = await axios.get(scrapingBeeUrl, {
            params: {
                api_key: scrapingBeeApiKey,
                url: url
            }
        });

        if (response.status === 200) {
            const htmlContent = response.data;
            console.log('htmlContent:',htmlContent);
            const $ = cheerio.load(htmlContent);

            // Extract text from the current page
            const text = $('body').text().trim();
            console.log('-----------' + num + '-------------');
            allText.push(text);

            // Extract links from the current page and explore recursively
            const links = $('a').map((i, el) => $(el).attr('href')).get().slice(0, 5);
            for (const link of links) {
                allText = await scrape(link, num + 2, visited, allText);
            }
        } else {
            console.error('ScrapingBee request failed:', response);
        }
    } catch (error) {
        console.error('Error fetching page:', error.message);
    }

    return allText;
}


// Example usage:
// scrape('https://demo.syntag.org').then(allText => {
//     console.log('All text:', allText);
// }).catch(error => {
//     console.error('Error:', error);
// });
