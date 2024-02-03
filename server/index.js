const express = require('express');
const fs = require('fs');
const request = require('request');
const dotenv = require('dotenv');

const path = require('path');

dotenv.config();

const port = process.env.PORT || 5000;
global.access_token = '';

const spotify_client_id = process.env.SPOTIFY_CLIENT_ID;
const spotify_client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const spotify_redirect_uri = 'http://localhost:5000/auth/callback';

var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const app = express();

app.get('/auth/login', (req, res) => {
  var scope = "streaming user-read-email user-read-private user-top-read user-modify-playback-state user-library-modify";
  var state = generateRandomString(16);

  var auth_query_parameters = new URLSearchParams({
    response_type: "code",
    client_id: spotify_client_id,
    scope: scope,
    redirect_uri: spotify_redirect_uri,
    state: state
  });

  res.redirect('https://accounts.spotify.com/authorize/?' + auth_query_parameters.toString());
});

app.get('/auth/callback', (req, res) => {
  var code = req.query.code;

  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code: code,
      redirect_uri: spotify_redirect_uri,
      grant_type: 'authorization_code'
    },
    headers: {
      'Authorization': 'Basic ' + (Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64')),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      access_token = body.access_token;
      refresh_token = body.refresh_token;
      res.redirect('/');
    }
  });
});

app.get('/auth/refresh_token', (req, res) => {
  var refreshOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'Authorization': 'Basic ' + (Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64')),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(refreshOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      access_token = body.access_token;
      res.json({ access_token: access_token });
    } else {
      res.status(response.statusCode).json({ error: 'Failed to refresh token' });
    }
  });
});

app.get('/top-tracks', async (req, res) => {
  const randomOffset = Math.floor(Math.random() * 50);

  const options = {
    url: `https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=1&offset=${randomOffset}`,
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  request.get(options, function(error, response, body) {
    console.log('Requesting a random top track');

    if (error) {
      console.error('Error fetching a random top track:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    console.log('Response Status:', response.statusCode);
    if (response.statusCode === 200) {
      const randomTrack = body.items[0];

      console.log('Random Track Data:', randomTrack);
      res.json(randomTrack);
    } else {
      console.error('Error Response Body:', body);
      res.status(response.statusCode).json({ error: body });
    }
  });
});

app.get('/genre-seeds', async (req, res) => {
  if (fs.existsSync('genre-seeds.json')) {
    const cachedGenres = JSON.parse(fs.readFileSync('genre-seeds.json'));
    console.log('Genres fetched from JSON file');
    return res.json(cachedGenres);
  }

  const options = {
    url: 'https://api.spotify.com/v1/recommendations/available-genre-seeds',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  request.get(options, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      const genres = body.genres;

      fs.writeFileSync('genre-seeds.json', JSON.stringify(genres));
      console.log('Genres fetched from Spotify API and cached to JSON file');

      res.json(genres);
    } else {
      console.error('Error fetching genres:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

app.get('/recommendations', async (req, res) => {
  const seed_tracks = req.query.seed_tracks;
  const seed_genres = req.query.seed_genres;
  const limit = req.query.limit || 1;

  let url = `https://api.spotify.com/v1/recommendations?limit=${limit}`;

  if (seed_tracks) {
    url += `&seed_tracks=${seed_tracks}`;
  }

  if (seed_genres) {
    url += `&seed_genres=${seed_genres}`;
  }

  const options = {
    url: url,
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  request.get(options, function(error, response, body) {
    if (error) {
      console.error('Error fetching recommendations:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (response.statusCode === 200) {
      res.json(body);
    } else {
      console.error('Error Response Body:', body);
      res.status(response.statusCode).json({ error: body });
    }
  });
});  

app.get('/auth/token', (req, res) => {
  res.json({ access_token: access_token });
});

app.use(express.static(path.join(__dirname, '../build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
