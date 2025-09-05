from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import requests
import os
import logging
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend fetch requests

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.DEBUG)

# API keys
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
WEATHER_API_KEY = os.getenv('WEATHER_API_KEY')
NEWS_API_KEY = os.getenv('NEWS_API_KEY')
GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

# Validate API keys
if not all([GEMINI_API_KEY, WEATHER_API_KEY, NEWS_API_KEY]):
    app.logger.error("Missing one or more API keys in .env file")
    raise EnvironmentError("Please ensure GEMINI_API_KEY, WEATHER_API_KEY, and NEWS_API_KEY are set in .env")

@app.route('/')
def index():
    app.logger.debug("Rendering index.html")
    return render_template('index.html')

@app.route('/login')
def login():
    app.logger.debug("Rendering login.html")
    return render_template('login.html')

@app.route('/query', methods=['POST'])
def query():
    try:
        user_input = request.json.get('query')
        command = request.json.get('command')
        if not user_input and command not in ['news']:
            app.logger.error('No query provided in request')
            return jsonify({'error': 'No query provided'}), 400
        
        app.logger.debug(f'Received query: {user_input}, Command: {command}')
        
        # Handle specific commands
        if command == 'weather':
            return get_weather(user_input)
        if command == 'news':
            return get_news()
        
        # Default to Gemini for general queries
        headers = {
            'Content-Type': 'application/json'
        }
        payload = {
            'contents': [{
                'parts': [{'text': user_input}]
            }],
            'generationConfig': {
                'maxOutputTokens': 100,
                'temperature': 0.7
            }
        }
        
        app.logger.debug(f'Sending request to Gemini: {payload}')
        response = requests.post(f'{GEMINI_ENDPOINT}?key={GEMINI_API_KEY}', headers=headers, json=payload)
        response.raise_for_status()
        
        response_data = response.json()
        app.logger.debug(f'Gemini response: {response_data}')
        
        if 'candidates' not in response_data or not response_data['candidates']:
            app.logger.error('No candidates in Gemini response')
            return jsonify({'error': 'No response from Gemini'}), 500
        
        ai_response = response_data['candidates'][0]['content']['parts'][0]['text']
        app.logger.debug(f'Parsed response: {ai_response}')
        return jsonify({'response': ai_response})
    
    except requests.exceptions.HTTPError as http_err:
        app.logger.error(f'HTTP error: {http_err}, Response: {response.text}')
        return jsonify({'error': f'Gemini API error: {response.text}'}), 500
    except requests.exceptions.RequestException as req_err:
        app.logger.error(f'Network error: {req_err}')
        return jsonify({'error': f'Network error: {str(req_err)}'}), 500
    except KeyError as key_err:
        app.logger.error(f'Key error in response parsing: {key_err}, Response: {response_data}')
        return jsonify({'error': 'Invalid Gemini response format'}), 500
    except Exception as e:
        app.logger.error(f'Unexpected error: {str(e)}')
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

def get_weather(city):
    try:
        if not city:
            city = 'New York'
        weather_url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={WEATHER_API_KEY}&units=metric"
        response = requests.get(weather_url).json()
        if response.get('cod') != 200:
            app.logger.error(f'Weather API error: {response.get("message", "Unknown error")}')
            return jsonify({'error': response.get('message', 'Weather API error')}), 400
        temp = response['main']['temp']
        desc = response['weather'][0]['description']
        ai_response = f"Weather in {city}: {temp:.1f}°C, {desc}"
        app.logger.debug(f'Weather response: {ai_response}')
        return jsonify({'response': ai_response})
    except Exception as e:
        app.logger.error(f'Weather error: {str(e)}')
        return jsonify({'error': 'Couldn\'t fetch weather data'}), 500

def get_news():
    try:
        news_url = f"https://newsapi.org/v2/top-headlines?country=us&apiKey={NEWS_API_KEY}"
        response = requests.get(news_url).json()
        if response.get('status') != 'ok':
            app.logger.error(f'News API error: {response.get("message", "Unknown error")}')
            return jsonify({'error': 'News API error'}), 400
        headlines = [article['title'] for article in response['articles'][:3]]
        ai_response = "Top news: " + " | ".join(headlines)
        app.logger.debug(f'News response: {ai_response}')
        return jsonify({'response': ai_response})
    except Exception as e:
        app.logger.error(f'News error: {str(e)}')
        return jsonify({'error': 'Couldn\'t fetch news'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)