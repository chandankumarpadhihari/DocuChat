const { Configuration, OpenAIApi } = require('openai');
const pdfParse = require('pdf-parse');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method not allowed' })
        };
    }

    try {
        const { question, document, filename, filetype } = JSON.parse(event.body);

        if (!question || !document) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing required fields: question and document are required' })
            };
        }

        if (!process.env.OPENAI_API_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'OpenAI API key is not configured' })
            };
        }

        // Process document content based on file type
        let processedContent;
        if (filetype === 'application/pdf') {
            try {
                // Remove the data URL prefix if present
                const base64Data = document.replace(/^data:application\/pdf;base64,/, '');
                const pdfBuffer = Buffer.from(base64Data, 'base64');
                const pdfData = await pdfParse(pdfBuffer);
                processedContent = pdfData.text;
                
                if (!processedContent.trim()) {
                    throw new Error('No text content found in PDF');
                }
            } catch (pdfError) {
                console.error('PDF parsing error:', pdfError);
                return {
                    statusCode: 400,
                    body: JSON.stringify({ 
                        message: 'Error processing PDF file',
                        error: pdfError.message 
                    })
                };
            }
        } else {
            processedContent = document;
        }

        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY
        });
        const openai = new OpenAIApi(configuration);

        // Create a prompt that includes the document content and the question
        const prompt = `Document content from ${filename}:\n\n${processedContent}\n\nQuestion: ${question}\n\nAnswer:`;

        const completion = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: prompt,
            max_tokens: 500,
            temperature: 0.7,
        });

        const response = completion.data.choices[0].text?.trim() || 'Sorry, I could not generate a response.';

        return {
            statusCode: 200,
            body: JSON.stringify({ response })
        };

    } catch (error) {
        console.error('Error:', error);
        
        // Handle specific OpenAI API errors
        if (error.response) {
            return {
                statusCode: error.response.status,
                body: JSON.stringify({ 
                    message: 'OpenAI API Error',
                    error: error.response.data.error?.message || error.message
                })
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({ 
                message: 'Error processing request',
                error: error.message 
            })
        };
    }
}; 