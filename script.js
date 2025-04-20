let currentFile = null;
let fileContent = null;

// Helper function to safely get elements
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.error(`Element with id '${id}' not found`);
        return null;
    }
    return element;
}

// Helper function to safely set element properties
function setElementProperty(id, property, value) {
    const element = getElement(id);
    if (element) {
        element[property] = value;
    }
}

document.getElementById('fileInput').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        // Show loading state
        setElementProperty('fileStatus', 'textContent', 'Processing file...');
        setElementProperty('fileInput', 'disabled', true);
        setElementProperty('upload-btn', 'disabled', true);

        // Validate file type
        if (!file.type.match(/text\/.*|application\/pdf/)) {
            throw new Error('Please upload a text or PDF file');
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            throw new Error('File size must be less than 10MB');
        }

        // Read file content
        fileContent = await readFileContent(file);
        if (!fileContent) {
            throw new Error('Could not read file content');
        }

        currentFile = file;

        // Update UI
        setElementProperty('fileStatus', 'textContent', `File loaded: ${file.name}`);
        setElementProperty('questionInput', 'disabled', false);
        setElementProperty('sendBtn', 'disabled', false);
        addMessage('system', `Document "${file.name}" uploaded successfully!`);

    } catch (error) {
        console.error('Error processing file:', error);
        setElementProperty('fileStatus', 'textContent', error.message || 'Error processing file. Please try again.');
        addMessage('system', `Error: ${error.message || 'Could not process the file. Please try again.'}`);
        // Reset file input
        e.target.value = '';
        currentFile = null;
        fileContent = null;
    } finally {
        setElementProperty('fileInput', 'disabled', false);
        setElementProperty('upload-btn', 'disabled', false);
    }
});

document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('questionInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

async function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                if (!content) {
                    reject(new Error('File is empty'));
                    return;
                }
                resolve(content);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = (error) => {
            reject(new Error('Error reading file'));
        };
        
        if (file.type === 'application/pdf') {
            reader.readAsDataURL(file);
        } else {
            reader.readAsText(file);
        }
    });
}

async function sendMessage() {
    const input = getElement('questionInput');
    if (!input) return;

    const question = input.value.trim();
    
    if (!question || !currentFile || !fileContent) {
        addMessage('system', 'Please upload a document and enter a question.');
        return;
    }

    try {
        // Disable input while processing
        setElementProperty('questionInput', 'disabled', true);
        setElementProperty('sendBtn', 'disabled', true);
        
        // Add user message
        addMessage('user', question);
        input.value = '';

        // Show loading indicator
        const loadingMessage = addMessage('ai', 'Processing document and generating response...');
        
        // Call OpenAI API
        const baseUrl = window.location.origin;
        const response = await fetch(`${baseUrl}/.netlify/functions/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question,
                document: fileContent,
                filename: currentFile.name,
                filetype: currentFile.type
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to get response from server');
        }

        const data = await response.json();
        
        // Remove loading message and add AI response
        loadingMessage.remove();
        addMessage('ai', data.response);

    } catch (error) {
        console.error('Error:', error);
        addMessage('system', `Error: ${error.message || 'Sorry, there was an error processing your request. Please try again.'}`);
    } finally {
        // Re-enable input
        setElementProperty('questionInput', 'disabled', false);
        setElementProperty('sendBtn', 'disabled', false);
        input.focus();
    }
}

function addMessage(type, content) {
    const messagesDiv = getElement('chatMessages');
    if (!messagesDiv) return null;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    messageDiv.textContent = content;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    return messageDiv;
} 