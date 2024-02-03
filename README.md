# Spotify Track Recommendation Web App 
## Description
This application provides a personalized music experience by integrating with the Spotify API. It allows users to log in with their Spotify account, fetch their top tracks, generate music recommendations based on their preferences, add randomness into the mix, and control playback directly from the web interface.

## Features
User authentication with Spotify\
Fetching user's top tracks\
Generating music recommendations\
Playback control within the web app\
Ability to refresh Spotify tokens
## Requirements
Node.js\
A Spotify Premium account\
An application registered on the Spotify for Developers site\
# Setup
## Registering Your Application with Spotify
Go to the Spotify Developer Dashboard.\
Log in with your Spotify account.\
Click "Create an App".\
Fill in the app name, description, and agree to the terms.\
Take note of the Client ID and Client Secret.\
Click "Edit Settings" and add http://localhost:5000/auth/callback to the "Redirect URIs" section.

## Installation
Clone the repository to your local machine.\
Navigate to the project directory.\
Create a .env file in the root directory of your project. Add the following environment variables:

SPOTIFY_CLIENT_ID='your_spotify_client_id'\
SPOTIFY_CLIENT_SECRET='your_spotify_client_secret'

Replace 'your_spotify_client_id' and 'your_spotify_client_secret' with the Client ID and Client Secret you obtained from your Spotify app settings.\
Install the required Node.js modules by running 'npm install'.\
Build the frontend application by running 'npm run build'.\
Start the backend server by running 'node server'.

Usage
Open your browser and navigate to http://localhost:5000.\
Click the login link to authenticate with Spotify.\
Once authenticated, you can view your top tracks, get music recommendations, and control playback.
