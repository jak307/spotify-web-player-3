import React, { useState, useEffect, useCallback } from 'react';

const track = {
  name: "",
  album: {
    images: [{ url: "" }]
  },
  artists: [{ name: "" }]
};

let spotifyPlayerInstance = null;

function WebPlayback(props) {
  const [is_paused, setPaused] = useState(false);
  const [player, setPlayer] = useState(undefined);
  const [current_track, setTrack] = useState(track);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);
  const [recommendedTracks, setRecommendedTracks] = useState([]);
  const [isDisplayVisible, setDisplayVisible] = useState(true);
  const [isRecommendationPlayed, setIsRecommendationPlayed] = useState(false);
  const [playedTracks, setPlayedTracks] = useState(new Set());
  const [sessionHistory, setSessionHistory] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [genres, setGenres] = useState([]);
  const [randomness, setRandomness] = useState(0);
  const [seededTracks, setSeededTracks] = useState([]);
  const remainingTime = formatTime(trackDuration - currentPosition);
  const currentPositionFormatted = formatTime(currentPosition);
  const [isAutoplayEnabled, setAutoplayEnabled] = useState(false);
  const [autoplayType, setAutoplayType] = useState("similar");
  const [isAutoplayPanelVisible, setAutoplayPanelVisible] = useState(false);
  const [isPlayerReady, setPlayerReady] = useState(false);

  useEffect(() => {
    if (!window.Spotify) {
      console.log("Adding Spotify SDK script to the document");
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
    } else {
      console.log("Spotify SDK already present");
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log("Spotify Web Playback SDK Ready");
      if (!spotifyPlayerInstance) {
        spotifyPlayerInstance = new window.Spotify.Player({
          name: 'Web Playback SDK',
          getOAuthToken: cb => { cb(props.token); },
          volume: 0.5
        });

        spotifyPlayerInstance.addListener('ready', ({ device_id }) => {
          console.log('Ready with Device ID', device_id);
          transferPlaybackHere(device_id);
          setPlayerReady(true);
        });

        spotifyPlayerInstance.addListener('not_ready', ({ device_id }) => {
          console.log('Device ID has gone offline', device_id);
        });

        spotifyPlayerInstance.addListener('player_state_changed', state => {
          console.log("Player state changed", state);
          if (!state) {
            return;
          }
          setTrack(state.track_window.current_track);
          setPaused(state.paused);
          setTrackDuration(state.duration);
        });

        spotifyPlayerInstance.connect();
      }
      setPlayer(spotifyPlayerInstance);
    };
  }, [props.token, setPlayerReady]);

  const transferPlaybackHere = useCallback(async (device_id) => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        body: JSON.stringify({ device_ids: [device_id], play: false }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${props.token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to transfer playback');
      }
      console.log('Playback transferred to web player');
    } catch (error) {
      console.error('Error transferring playback:', error);
    }
  }, [props.token]);  

  useEffect(() => {
    async function fetchRecommendedSongs() {
      try {
        console.log("Fetching recommended songs");
        const topTrackResponse = await fetch('/top-tracks');
        const topTrackData = await topTrackResponse.json();
    
        if (!topTrackData || !topTrackData.id) {
          throw new Error('No top track found');
        }
    
        const recommendationsResponse = await fetch(`/recommendations?seed_tracks=${topTrackData.id}`);
        const recommendationsData = await recommendationsResponse.json();
    
        setRecommendedTracks(recommendationsData.tracks);
      } catch (error) {
        console.error('Error fetching recommended songs:', error);
      }
    }    

    if (player && props.token) {
      fetchRecommendedSongs();
    }
  }, [player, props.token]);
  
  useEffect(() => {
    const updatePosition = () => {
      if (player) {
        player.getCurrentState().then(state => {
          if (state) {
            setCurrentPosition(state.position);
          }
        }).catch(console.error);
      }
    };

    const updatePositionInterval = setInterval(updatePosition, 1000);

    return () => clearInterval(updatePositionInterval);
  }, [player]);

  useEffect(() => {
    fetch('/genre-seeds')
      .then(response => response.json())
      .then(data => setGenres(data))
      .catch(console.error);
  }, []);

  const toggleDisplay = () => {
    setDisplayVisible(!isDisplayVisible);
  };

  useEffect(() => {
    if (remainingTime === "0:01" && current_track.name !== "") {
      console.log("Track over");
      if (isAutoplayEnabled) {
        if (autoplayType === "new") {
          playSomethingElse();
        } else {
          playRecommendedBySeeds();
        }
      }
    }
  }, [remainingTime, current_track.name, isAutoplayEnabled, autoplayType]);     

  function playTrack(spotifyUri, trackId) {
    console.log("Playing track", spotifyUri);
    setPlayedTracks(prevPlayedTracks => new Set(prevPlayedTracks).add(trackId));
    fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      body: JSON.stringify({ uris: [spotifyUri] }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${props.token}`
      }
    });
    setSessionHistory(prevHistory => [...prevHistory, trackId]);
    setCurrentTrackIndex(prevIndex => prevIndex + 1);
  }

  const playRecommendedBySeeds = async () => {
    let currentSeeds = seededTracks;
  
    if (current_track.id && !seededTracks.includes(current_track.id)) {
      const newSeeds = [current_track.id, ...seededTracks];
      if (newSeeds.length > 5) {
        newSeeds.pop();
      }
  
      setSeededTracks(newSeeds);
      currentSeeds = newSeeds;
    }
  
    if (currentSeeds.length > 0) {
      const seed_tracks = currentSeeds.join(',');
      try {
        const recommendationsResponse = await fetch(`/recommendations?seed_tracks=${seed_tracks}&limit=1`);
        const recommendationsData = await recommendationsResponse.json();
  
        const recommendedTrack = recommendationsData.tracks.find(track => !playedTracks.has(track.id));
        if (recommendedTrack) {
          setIsRecommendationPlayed(true);
          playTrack(recommendedTrack.uri, recommendedTrack.id);
        } else {
          console.error('All recommended tracks have been played or no recommendations found');
        }
      } catch (error) {
        console.error('Error in playRecommendedBySeeds:', error);
      }
    }
  };  

  const fetchAndPlayRandomTrack = async () => {
    try {
      console.log("Fetching random top track and its recommendation");
      const topTrackResponse = await fetch('/top-tracks');
      const topTrackData = await topTrackResponse.json();
  
      if (!topTrackData || !topTrackData.id) {
        throw new Error('No top track found');
      }
  
      const recommendationsResponse = await fetch(`/recommendations?seed_tracks=${topTrackData.id}&limit=1`);
      const recommendationsData = await recommendationsResponse.json();

      const recommendedTrack = recommendationsData.tracks.find(track => !playedTracks.has(track.id));
      if (recommendedTrack) {
        setIsRecommendationPlayed(true);
        playTrack(recommendedTrack.uri, recommendedTrack.id);
      } else {
        console.error('All recommended tracks have been played or no recommendations found');
      }
    } catch (error) {
      console.error('Error in fetchAndPlayRandomTrack:', error);
    }
  };

  const playRandomGenreTrack = async () => {
    const randomGenre = genres[Math.floor(Math.random() * genres.length)];
    const recommendationsResponse = await fetch(`/recommendations?seed_genres=${randomGenre}&limit=1`);
    const recommendationsData = await recommendationsResponse.json();  
    const recommendedTrack = recommendationsData.tracks[0];
    if (recommendedTrack) {
      playTrack(recommendedTrack.uri, recommendedTrack.id);
    } else {
      console.error('No recommendations found for this genre');
    }
  };

  const playSomethingElse = () => {
    setIsRecommendationPlayed(true);
    setSeededTracks([]);
    const randomValue = Math.random() * 100;
    if (randomValue > randomness) {
      fetchAndPlayRandomTrack();
    } else {
      playRandomGenreTrack();
    }
  };  

  function playTrackById(trackId) {
    const spotifyUri = `spotify:track:${trackId}`;
    console.log("Playing track by ID", trackId);
    fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      body: JSON.stringify({ uris: [spotifyUri] }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${props.token}`
      }
    }).then(response => {
      if (!response.ok) {
        throw new Error('Failed to play track');
      }
      console.log('Track played successfully');
    }).catch(error => {
      console.error('Error playing track:', error);
    });
  }
  
  const playPreviousTrack = () => {
    if (currentTrackIndex > 0) {
      const previousTrackId = sessionHistory[currentTrackIndex - 1];
      playTrackById(previousTrackId);
      setCurrentTrackIndex(currentTrackIndex - 1);
    }
  };

  const playNextTrack = () => {
    if (currentTrackIndex < sessionHistory.length - 1) {
      const nextTrackId = sessionHistory[currentTrackIndex + 1];
      playTrackById(nextTrackId);
      setCurrentTrackIndex(currentTrackIndex + 1);
    }
  };

  const handleSliderChange = (event) => {
    const newPosition = Number(event.target.value);
    setCurrentPosition(newPosition);
    player.seek(newPosition).catch(console.error);
  };

  const addToLibrary = async () => {
    if (current_track.id) {
      try {
        const response = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${current_track.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${props.token}`
          }
        });
        if (response.ok) {
          console.log('Track added to library successfully');
        } else {
          console.error('Error adding track to library:', response.statusText);
        }
      } catch (error) {
        console.error('Error adding track to library:', error);
      }
    }
  };  

  function formatTime(seconds) {
    const min = Math.floor(seconds / 60000);
    const sec = ((seconds % 60000) / 1000).toFixed(0);
    return min + ":" + (sec < 10 ? '0' : '') + sec;
  }

  const LoadingIndicator = () => (
    <div className="loading-indicator">Loading...</div>
  );

  const AutoplaySettingsPanel = () => {
    return (
      <div className="autoplay-settings">
        <h3>Autoplay Settings</h3>
        <label>
          <input
            type="checkbox"
            checked={isAutoplayEnabled}
            onChange={() => setAutoplayEnabled(!isAutoplayEnabled)}
          />
          Enable Autoplay
        </label>
  
        {isAutoplayEnabled && (
          <div>
            <label>
              <input
                type="radio"
                value="new"
                checked={autoplayType === "new"}
                onChange={() => setAutoplayType("new")}
              />
              Autoplay Something New
            </label>
            <label>
              <input
                type="radio"
                value="similar"
                checked={autoplayType === "similar"}
                onChange={() => setAutoplayType("similar")}
              />
              Autoplay Something Similar
            </label>
          </div>
        )}
  
        <button onClick={() => setAutoplayPanelVisible(false)}>OK</button>
      </div>
    );
  };  

  return (
    <>
      <div className="container">
        <div className="main-wrapper">
          {!isRecommendationPlayed && (
            <div>
              <div>
                <label htmlFor="randomness-slider">
                  How much do you want to broaden your horizons? {randomness}%
                </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={randomness}
                    onChange={(e) => setRandomness(e.target.value)}
                  />
              </div>
              {isPlayerReady ? (
                <button 
                  className="btn-spotify btn-always-green" 
                  onClick={playSomethingElse}
                >
                  Play A Track
                </button>
              ) : (
                <LoadingIndicator />
              )}
            </div>
          )}
  
          {isRecommendationPlayed && (
            <>
              <div className="display-toggle">
                <button className="btn-toggle-display" onClick={toggleDisplay}>
                  {isDisplayVisible ? "Hide Display" : "Show Display"}
                </button>
              </div>
  
              {isDisplayVisible && (
                <div className="now-playing">
                  <img src={current_track.album.images[0].url} className="now-playing__cover" alt="" />
                  <div className="now-playing__info">
                    <div className="now-playing__name">{current_track.name}</div>
                    <div className="now-playing__artist">{current_track.artists[0].name}</div>
                  </div>
                </div>
              )}
  
              <div>
                <input
                  type="range"
                  min="0"
                  max={trackDuration}
                  value={currentPosition}
                  onChange={handleSliderChange}
                />
              </div>
              <div>
                {currentPositionFormatted} / {remainingTime}
                <button className="btn-spotify" onClick={addToLibrary}>
                  Add to Library
                </button>
              </div>

              {currentTrackIndex > 0 && (
                <button onClick={playPreviousTrack}>
                  <i className="fas fa-step-backward"></i>
                </button>
              )}

              <button className="btn-spotify" onClick={() => {
                console.log("Toggle play/pause button clicked", player);
                if (player) {
                  player.togglePlay();
                } else {
                  console.error("Player object is null");
                }
              }}>
                {is_paused ? <i className="fas fa-play"></i> : <i className="fas fa-pause"></i>}
              </button>

              {currentTrackIndex < sessionHistory.length - 1 && (
                <button onClick={playNextTrack}>
                  <i className="fas fa-step-forward"></i>
                </button>
              )}
              
              <div>
                <button className="btn-spotify btn-always-green" onClick={playRecommendedBySeeds}>
                  Play More Like This
                </button>

                <button className="btn-spotify btn-always-green" onClick={playSomethingElse}>
                  Play Something Else
                </button>

              </div>
              <div>
                <label htmlFor="randomness-slider">
                  Randomness: {randomness}%
                </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={randomness}
                    onChange={(e) => setRandomness(e.target.value)}
                  />
              </div>
              <div>
                <button onClick={() => setAutoplayPanelVisible(true)}>Autoplay Settings</button>
                {isAutoplayPanelVisible && <AutoplaySettingsPanel />}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default WebPlayback;
