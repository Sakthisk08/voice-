const startBtn = document.getElementById('start-btn');
const transcript = document.getElementById('transcript');
const responseElem = document.getElementById('response');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

// Check if on login page
const isLoginPage = window.location.pathname.includes('login');

// Login handling
function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (username && password) {
        // Store login data in localStorage
        localStorage.setItem('user', JSON.stringify({ username, password }));
        window.location.href = '/';
    } else {
        loginError.textContent = 'Please enter both username and password.';
        loginError.style.display = 'block';
    }
}

// Check login status
function checkLogin() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user && !isLoginPage) {
        window.location.href = '/login'; // Changed from 'login.html' to '/login'
    }
}

// Logout
function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('chatHistory');
    localStorage.removeItem('reminders');
    window.location.href = '/login'; // Changed from 'login.html' to '/login'
}

// Only initialize speech recognition if not on login page
if (!isLoginPage) {
    let recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    // Voice feedback when listening starts
    recognition.onstart = () => {
        console.log('Starting speech recognition...');
        transcript.textContent = 'Listening...';
        startBtn.classList.add('listening');
        speakResponse('I’m listening, go ahead and speak.');
    };

    // Remove listening class when recognition ends
    recognition.onend = () => {
        startBtn.classList.remove('listening');
    };

    startBtn.addEventListener('click', () => {
        recognition.start();
    });

    recognition.onresult = (event) => {
        const query = event.results[0][0].transcript;
        transcript.textContent = `You said: ${query}`;
        console.log(`Recognized query: ${query}`);
        
        if (handleCommand(query)) {
            console.log('Command handled successfully');
            return;
        }
        
        console.log('Falling back to Gemini API');
        sendQueryToBackend(query, 'general');
    };

    recognition.onerror = (event) => {
        transcript.textContent = 'Error: ' + event.error;
        speakResponse('Sorry, I couldn’t understand that. Please try again.');
        console.error('Speech recognition error:', event.error);
    };
}

// Attach login handler if on login page
if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}

function handleCommand(query) {
    const lowerQuery = query.toLowerCase().trim();
    console.log('Processing command:', lowerQuery);
    
    if (lowerQuery.includes('open youtube') || lowerQuery.includes('go to youtube') || lowerQuery === 'youtube') {
        window.open('https://www.youtube.com', '_blank');
        const response = 'Opening YouTube for you!';
        responseElem.textContent = response;
        speakResponse(response);
        saveHistory(query, response);
        return true;
    }
    
    if (lowerQuery.includes('play a cool song') && lowerQuery.includes('youtube')) {
        const coolSongUrl = 'https://www.youtube.com/watch?v=3JZ4pnNtyxQ';
        window.open(coolSongUrl, '_blank');
        const response = 'Playing a cool song for you on YouTube!';
        responseElem.textContent = response;
        speakResponse(response);
        saveHistory(query, response);
        return true;
    }
    
    if (lowerQuery.startsWith('play ') && lowerQuery.includes(' on youtube')) {
        const songQuery = lowerQuery.replace('play ', '').replace(' on youtube', '').trim();
        if (songQuery) {
            const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(songQuery)}`;
            window.open(youtubeUrl, '_blank');
            const response = `Playing ${songQuery} on YouTube!`;
            responseElem.textContent = response;
            speakResponse(response);
            saveHistory(query, response);
            return true;
        }
    }
    
    if (lowerQuery.startsWith('search for ') || lowerQuery.startsWith('search ') || lowerQuery.includes('search on google')) {
        const searchQuery = lowerQuery.replace('search for ', '').replace('search ', '').replace(' on google', '').trim();
        if (searchQuery) {
            const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
            window.open(googleUrl, '_blank');
            const response = `Searching Google for ${searchQuery}!`;
            responseElem.textContent = response;
            speakResponse(response);
            saveHistory(query, response);
            return true;
        }
    }
    
    if (lowerQuery.includes('open calendar') || lowerQuery.includes('show calendar') || lowerQuery.includes('calendar')) {
        const calendarUrl = 'https://calendar.google.com';
        window.open(calendarUrl, '_blank');
        const response = 'Opening Google Calendar for you!';
        responseElem.textContent = response;
        speakResponse(response);
        saveHistory(query, response);
        return true;
    }
    
    if (lowerQuery.includes('weather')) {
        const city = lowerQuery.replace('weather in ', '').replace('weather', '').trim() || 'New York';
        sendQueryToBackend(city, 'weather');
        return true;
    }
    
    if (lowerQuery.includes('news')) {
        sendQueryToBackend('', 'news');
        return true;
    }
    
    if (lowerQuery.startsWith('set reminder ') || lowerQuery.startsWith('reminder ')) {
        const reminderText = lowerQuery.replace('set reminder ', '').replace('reminder ', '').trim();
        if (reminderText) {
            const response = `Reminder set: ${reminderText}!`;
            saveReminder(reminderText);
            responseElem.textContent = response;
            speakResponse(response);
            saveHistory(query, response);
            return true;
        }
    }
    
    if (lowerQuery.startsWith('calculate ') || lowerQuery.includes('what is ') || lowerQuery.includes(' plus ') || lowerQuery.includes(' minus ') || lowerQuery.includes(' times ') || lowerQuery.includes(' divided by ')) {
        let expression = lowerQuery
            .replace('calculate ', '')
            .replace('what is ', '')
            .replace(' plus ', ' + ')
            .replace(' minus ', ' - ')
            .replace(' times ', ' * ')
            .replace(' divided by ', ' / ')
            .replace(/\bone\b/gi, '1')
            .replace(/\btwo\b/gi, '2')
            .replace(/\bthree\b/gi, '3')
            .replace(/\bfour\b/gi, '4')
            .replace(/\bfive\b/gi, '5')
            .replace(/\bsix\b/gi, '6')
            .replace(/\bseven\b/gi, '7')
            .replace(/\beight\b/gi, '8')
            .replace(/\bnine\b/gi, '9')
            .replace(/\bten\b/gi, '10')
            .replace(/\bhundred\b/gi, '100')
            .replace(/\bthousand\b/gi, '1000')
            .replace(/\bmillion\b/gi, '1000000')
            .replace(/[^\d+\-*/.() ]/g, '')
            .trim();
        console.log('Parsed math expression:', expression);
        try {
            const result = math.evaluate(expression, { number: 'BigNumber' });
            const response = `Result: ${expression} = ${result.toString()}`;
            responseElem.textContent = response;
            speakResponse(response);
            saveHistory(query, response);
            return true;
        } catch (e) {
            console.error('Math evaluation error:', e.message);
            const response = 'Sorry, I couldn’t calculate that. Please try a valid math expression like "123456 plus 789456" or "what is 5 times 3".';
            responseElem.textContent = response;
            speakResponse(response);
            saveHistory(query, response);
            return true;
        }
    }
    
    if (lowerQuery.includes('open notepad') || lowerQuery.includes('open notes')) {
        const notepadUrl = 'https://docs.google.com/document/create';
        window.open(notepadUrl, '_blank');
        const response = 'Opening a new Google Docs document for you!';
        responseElem.textContent = response;
        speakResponse(response);
        saveHistory(query, response);
        return true;
    }
    
    if (lowerQuery.includes('open camera') || lowerQuery.includes('camera')) {
        const cameraUrl = 'https://webcamtests.com';
        window.open(cameraUrl, '_blank');
        const response = 'Opening a web-based camera tool for you!';
        responseElem.textContent = response;
        speakResponse(response);
        saveHistory(query, response);
        return true;
    }
    
    if (lowerQuery.includes('take screenshot') || lowerQuery.includes('screenshot')) {
        const response = 'Please use your browser’s screenshot tool, like Ctrl+Shift+S in Chrome.';
        responseElem.textContent = response;
        speakResponse(response);
        saveHistory(query, response);
        return true;
    }
    
    return false;
}

function sendQueryToBackend(query, command) {
    responseElem.textContent = 'Processing...';
    console.log(`Sending to backend: query=${query}, command=${command}`);
    fetch('/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query, command: command })
    })
    .then(response => {
        console.log('Fetch response status:', response.status);
        return response.json();
    })
    .then(data => {
        if (data.error) {
            responseElem.textContent = 'Error: ' + data.error;
            speakResponse('Sorry, an error occurred. Please try again.');
            console.error('Backend error:', data.error);
        } else {
            responseElem.textContent = data.response;
            speakResponse(data.response);
            saveHistory(query, data.response);
            console.log('Backend response:', data.response);
        }
        displayHistory();
    })
    .catch(error => {
        responseElem.textContent = 'Error: ' + error;
        speakResponse('Sorry, a network error occurred.');
        console.error('Network error:', error);
    });
}

function speakResponse(text) {
    console.log('Speaking:', text);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
}

function saveHistory(query, response) {
    let history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    history.push({ query, response, timestamp: new Date().toISOString() });
    localStorage.setItem('chatHistory', JSON.stringify(history));
}

function saveReminder(text) {
    let reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    reminders.push({ text, timestamp: new Date().toISOString() });
    localStorage.setItem('reminders', JSON.stringify(reminders));
    displayHistory();
}

function checkReminders() {
    let reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    const now = new Date();
    reminders.forEach((reminder, index) => {
        alert(`Reminder: ${reminder.text}`);
        console.log(`Reminder triggered: ${reminder.text}`);
        reminders.splice(index, 1);
    });
    localStorage.setItem('reminders', JSON.stringify(reminders));
    displayHistory();
}

setInterval(checkReminders, 60000);

function displayHistory() {
    let history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    let reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    document.getElementById('history').innerHTML = 
        history.map(h => `<p><b>You:</b> ${h.query}<br><b>Assistant:</b> ${h.response}<br><small>${new Date(h.timestamp).toLocaleString()}</small></p>`).join('') +
        (reminders.length ? `<p><b>Reminders:</b> ${reminders.map(r => `${r.text} (set ${new Date(h.timestamp).toLocaleString()})`).join(', ')}</p>` : '');
}

function clearHistory() {
    localStorage.removeItem('chatHistory');
    localStorage.removeItem('reminders');
    displayHistory();
}

if (!isLoginPage) {
    displayHistory();
}