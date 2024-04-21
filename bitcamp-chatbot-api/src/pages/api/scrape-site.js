const puppeteer = require('puppeteer');
const express = require('express');

// Global browser instance
let browser;

const router = express.Router();

export default async function handler(req, res) {
    const url = req.query.url;

    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        const result = await scrape(url);  // Make sure scrape function is defined or imported
        //res.status(200).send(result);

        const blob = new Blob([result.join("\n")], { type: 'text/plain' });


    // Step 2: Create a FormData object to append your file and the purpose
    const formData = new FormData();
    formData.append('file', blob, "fileee.txt");//`${url}.txt`); // Adjust the filename as needed
    formData.append('purpose', 'assistants'); // Use 'assistants' or 'fine-tune' based on your requirement

    // Step 3: Make the Fetch request to upload the file
    const apiKey = 'sk-proj-09LMSwWcafY2G4diOdrbT3BlbkFJleBlhF3VK6GJwOAYOVRS';
    const fileUploadResponse = await fetch('https://api.openai.com/v1/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
                // 'Content-Type' is set automatically by FormData
            },
            body: formData
        });

    const fileData = await fileUploadResponse.json();
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
        res.status(500).json({ error: 'Failed to scrape site' });
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

async function scrape(url, num=0, visited = new Set(), all_text = []) {
    if (num >= 5) {
        //console.log('Max depth reached');
        return all_text;
    }

    if (visited.has(url)) {
        //console.log('Already visited:', url);
        return all_text;
    }
    visited.add(url);

    if (!browser) {
        browser = await puppeteer.launch();
    }

    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle0' });
        const texts = await page.evaluate(() => document.body.innerText.trim());
        //console.log(texts);
        console.log('-----------' + num + '-------------');

        all_text.push(texts); // Append text to all_text array

        const urls = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            return links.slice(0, 5).map(a => a.href);
        });
        //console.log(urls);
        
        for (url of urls) {
            all_text = await scrape(url, num + 2, visited, all_text); // Await the result of the recursive call and update all_text
        }
    } catch (error) {
        //console.error(num, 'Failed to process page:', url, '\nError:', error);
    } finally {
        await page.close();
    }

    return all_text; // Return the updated all_text array
}
