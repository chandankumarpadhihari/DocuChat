let currentFile = null;
let fileContent = null;

document.getElementById('fileInput').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        // Show loading state
        document.getElementById('fileStatus').textContent = 'Processing file...';
        document.getElementById('fileInput').disabled = true;
        document.getElementById('upload-btn').disabled = true;

        // Read file content
        fileContent = await readFileContent(file);
        currentFile = file;

        // Update UI
        document.getElementById('fileStatus').textContent = `File loaded: ${file.name}`;
        document.getElementById('questionInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
        addMessage('system', `Document "${file.name}" uploaded successfully!`);

    } catch (error) {
        console.error('Error processing file:', error);
        document.getElementById('fileStatus').textContent = 'Error processing file. Please try again.';
        addMessage('system', 'Error: Could not process the file. Please try again.');
    } finally {
        document.getElementById('fileInput').disabled = false;
        document.getElementById('upload-btn').disabled = false;
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
                resolve(content);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = (error) => reject(error);
        
        if (file.type === 'application/pdf') {
            reader.readAsDataURL(file);
        } else {
            reader.readAsText(file);
        }
    });
}

async function sendMessage() {
    const input = document.getElementById('questionInput');
    const question = input.value.trim();
    
    if (!question || !currentFile || !fileContent) {
        addMessage('system', 'Please upload a document and enter a question.');
        return;
    }

    try {
        // Disable input while processing
        input.disabled = true;
        document.getElementById('sendBtn').disabled = true;
        
        // Add user message
        addMessage('user', question);
        input.value = '';

        // Show loading indicator
        const loadingMessage = addMessage('ai', 'Thinking...');
        
        // Call OpenAI API
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question,
                document: fileContent,
                filename: currentFile.name
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Remove loading message and add AI response
        loadingMessage.remove();
        addMessage('ai', data.response);

    } catch (error) {
        console.error('Error:', error);
        addMessage('system', 'Sorry, there was an error processing your request. Please try again.');
    } finally {
        // Re-enable input
        input.disabled = false;
        document.getElementById('sendBtn').disabled = false;
        input.focus();
    }
}

function addMessage(type, content) {
    const messagesDiv = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    messageDiv.textContent = content;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    return messageDiv;
} 