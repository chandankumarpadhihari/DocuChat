const { Configuration, OpenAIApi } = require('openai');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method not allowed' })
        };
    }

    try {
        const { question, document, filename } = JSON.parse(event.body);

        if (!question || !document) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing required fields' })
            };
        }

        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY
        });
        const openai = new OpenAIApi(configuration);

        // Create a prompt that includes the document content and the question
        const prompt = `Document content from ${filename}:\n\n${document}\n\nQuestion: ${question}\n\nAnswer:`;

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
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                message: 'Error processing request',
                error: error.message 
            })
        };
    }
}; 