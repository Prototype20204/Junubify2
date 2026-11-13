import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioLines,
  BadgeCheck,
  CircleDollarSign,
  Compass,
  Download,
  Headphones,
  Heart,
  Music2,
  Pause,
  Play,
  Radio,
  Smartphone,
  Sparkles,
  TrendingUp,
  Upload,
  Wallet,
} from 'lucide-react';
import { supabase, supabaseConfigured } from './lib/supabase.js';
import { createTrackAudioUrl, fetchArtistTracks, fetchPublishedTracks, submitTrack } from './lib/catalog.js';

const paymentSetupMessage = 'Checkout and payouts are not connected yet. Configure a payment provider and secure backend before accepting money or promising transfers.';
const emptyForm = { title: '', artist: '', genre: 'Afrobeat', album: '', cover: '' };
const fallbackCover = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=500';

const demoTracks = [
  { id: 'demo-1', title: 'Juba City Lights (Preview)', artist: 'Junubify Sample', genre: 'Afrobeat', plays: 124500, cover: fallbackCover, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'demo-2', title: 'White Nile Groove (Preview)', artist: 'Junubify Sample', genre: 'Dancehall', plays: 98200, cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'demo-3', title: 'Peace in South Sudan (Preview)', artist: 'Junubify Sample', genre: 'Hip-Hop', plays: 215800, cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: 'demo-4', title: 'Bahr el Ghazal Breeze (Preview)', artist: 'Junubify Sample', genre: 'Traditional & Cultural', plays: 68400, cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: 'demo-5', title: 'Custom Bus Dance (Preview)', artist: 'Junubify Sample', genre: 'Afro-Pop', plays: 57300, cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
];

const genres = [
  { name: 'Juba Afrobeat', filter: 'Afrobeat', color: 'genre-green' },
  { name: 'Traditional & Cultural', filter: 'Traditional', color: 'genre-orange' },
  { name: 'South Sudan Hip-Hop', filter: 'Hip-Hop', color: 'genre-purple' },
  { name: 'Reggae & Dancehall', filter: 'Dancehall', color: 'genre-red' },
  { name: 'Gospel & Choir', filter: 'Gospel', color: 'genre-blue' },
];

const featuredPlaylists = [
  { id: 'playlist-1', name: 'Juba Nights', subtitle: 'Late-night energy', accent: 'forest', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=800', genre: 'Afrobeat' },
  { id: 'playlist-2', name: 'Nile Sunrise', subtitle: 'Warm rhythms', accent: 'gold', cover: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&q=80&w=800', genre: 'Traditional' },
  { id: 'playlist-3', name: 'Unity Mix', subtitle: 'Cross-city favorites', accent: 'sunset', cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=800', genre: 'Hip-Hop' },
  { id: 'playlist-4', name: 'Bassline South', subtitle: 'Dance all night', accent: 'deep', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800', genre: 'Dancehall' },
];

const safeLocalStorage = {
  read(key, fallback = {}) {
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  write(key, value) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage errors in private browsing mode.
    }
  },
};

export default function App() {
  const [tab, setTab] = useState('discover');
  const [tracks, setTracks] = useState([]);
  const [artistTracks, setArtistTracks] = useState([]);
  const [query, setQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [playing, setPlaying] = useState(null);
  const [notice, setNotice] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [email, setEmail] = useState('');
  const [session, setSession] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [likedTracks, setLikedTracks] = useState(() => safeLocalStorage.read('junubify-liked-tracks', {}));
  const audioRef = useRef(null);

  const notify = (message) => {
    setNotice(message);
    window.clearTimeout(notify.timeout);
    notify.timeout = window.setTimeout(() => setNotice(''), 5000);
  };

  useEffect(() => {
    if (!supabase) return undefined;

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) notify(error.message);
      setSession(data?.session ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshCatalog = async () => {
    if (!supabaseConfigured) return;
    setLoadingCatalog(true);
    setCatalogError('');

    try {
      const publicTracks = await fetchPublishedTracks();
      setTracks(publicTracks);
      if (session?.user?.id) {
        setArtistTracks(await fetchArtistTracks(session.user.id));
      } else {
        setArtistTracks([]);
      }
    } catch (error) {
      setCatalogError(error.message || 'Could not load the catalog.');
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    refreshCatalog();
  }, [session?.user?.id]);

  const handleFile = (file) => {
    if (!file) return;
    if (!/\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name) && !file.type.startsWith('audio/')) {
      return notify('Choose an audio file such as MP3, WAV, M4A, OGG, AAC, or FLAC.');
    }
    if (file.size > 50 * 1024 * 1024) {
      return notify('Audio file must be 50 MB or smaller.');
    }
    setSelectedFile(file);
  };

  const requestSignIn = async (event) => {
    event.preventDefault();
    if (!supabase) return notify('Add the Supabase project URL and anon key to enable artist sign-in.');

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) notify(error.message);
    else notify('Check your email for a secure sign-in link.');
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) notify(error.message);
    else notify('You have signed out.');
  };

  const publishTrack = async (event) => {
    event.preventDefault();
    if (!session?.user) return notify('Sign in to submit a track.');
    if (!selectedFile) return notify('Choose an audio file before submitting.');
    if (!rightsConfirmed) return notify('Confirm that you own or control the rights to this audio.');
    if (!form.title.trim() || !form.artist.trim()) return notify('Add a song title and artist name.');

    setSubmitting(true);
    try {
      const submission = await submitTrack({ file: selectedFile, form, artistId: session.user.id });
      setArtistTracks((current) => [submission, ...current]);
      setForm(emptyForm);
      setSelectedFile(null);
      setRightsConfirmed(false);
      event.currentTarget.reset();
      notify('Track uploaded securely and submitted for review. It will appear in Discover after approval.');
    } catch (error) {
      notify(error.message || 'Track upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const catalogTracks = tracks.length ? tracks : demoTracks;
  const visibleTracks = useMemo(() => {
    return catalogTracks.filter((track) => {
      const text = `${track.title} ${track.artist} ${track.genre}`.toLowerCase();
      const matchesText = text.includes(query.toLowerCase());
      const matchesGenre = !genreFilter || track.genre.toLowerCase().includes(genreFilter.toLowerCase());
      return matchesText && matchesGenre;
    });
  }, [catalogTracks, query, genreFilter]);

  useEffect(() => {
    if (!audioUrl || !playing || !audioRef.current) return;
    audioRef.current.play().catch(() => notify('Playback could not start. Tap play again or check your connection.'));
  }, [audioUrl, playing]);

  const playTrack = async (track) => {
    if (playing?.id === track.id && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch(() => notify('Could not play this audio file.'));
      } else {
        audioRef.current.pause();
      }
      return;
    }

    try {
      const url = track.audioPath ? await createTrackAudioUrl(track.audioPath) : track.audioUrl;
      if (!url) return notify('Audio is not available for this track.');
      setAudioUrl(url);
      setPlaying(track);
    } catch (error) {
      notify(error.message || 'Could not create a secure audio playback link.');
    }
  };

  const toggleLike = (trackId) => {
    setLikedTracks((current) => {
      const next = { ...current, [trackId]: !current[trackId] };
      safeLocalStorage.write('junubify-liked-tracks', next);
      return next;
    });
  };

  const shareTrack = async (track) => {
    const url = `${window.location.origin}/?track=${encodeURIComponent(track.id)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${track.title} · Junubify`, text: `Listen to ${track.title} by ${track.artist} on Junubify`, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        notify('Track link copied to clipboard.');
      } else {
        notify(url);
      }
    } catch (error) {
      if (error.name !== 'AbortError') notify('Could not share this track.');
    }
  };

  const selectGenre = (genre) => {
    setGenreFilter((current) => current === genre ? '' : genre);
    setQuery('');
    window.setTimeout(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  const openPlaylist = (playlist, autoplay = false) => {
    const matching = catalogTracks.filter((track) => track.genre.toLowerCase().includes(playlist.genre.toLowerCase()));
    if (!matching.length) return notify(`No ${playlist.name} songs are available yet.`);
    setGenreFilter(playlist.genre);
    setQuery('');
    if (autoplay) playTrack(matching[0]);
    window.setTimeout(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setTab('discover')} aria-label="Junubify home">
          <span className="brand-icon"><Radio size={21} /></span>
          <span>
            <b>JUNUBIFY</b>
            <small>SOUTH SUDAN BEATS</small>
          </span>
        </button>

        <input
          className="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setGenreFilter('');
          }}
          placeholder="Search tracks or artists"
          aria-label="Search tracks or artists"
        />

        <nav className="nav-tabs" aria-label="Main navigation">
          <button className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')}><Headphones size={17} /> Discover</button>
          <button className={tab === 'studio' ? 'active' : ''} onClick={() => setTab('studio')}><Upload size={17} /> Artist studio</button>
          <button className={tab === 'monetize' ? 'active' : ''} onClick={() => setTab('monetize')}><CircleDollarSign size={17} /> Monetization</button>
          <button className={tab === 'download' ? 'active' : ''} onClick={() => setTab('download')}><Smartphone size={17} /> Get the app</button>
        </nav>
      </header>

      <main className="content">
        {tab === 'discover' && (
          <>
            <section className="hero trend-hero">
              <div className="hero-copy">
                <span className="eyebrow"><AudioLines size={14} /> FEATURED JUBA PLAYLIST</span>
                <h1>Top 50 South Sudan Trends</h1>
                <p>Discover fresh voices, warm grooves, and powerful stories from Juba, Malakal, Yei, and every rhythm city across the Republic.</p>
                <div className="hero-actions">
                  <button className="button primary" onClick={() => setTab('studio')}><Upload size={16} /> Submit a track</button>
                  <button className="button secondary" onClick={() => setTab('download')}><Download size={16} /> Get the app</button>
                </div>
              </div>

              <div className="hero-visual panel">
                <img src="https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=700&q=85" alt="Featured musician" />
                <div className="hero-metrics">
                  <span><TrendingUp size={16} /> +17% this week</span>
                  <span><BadgeCheck size={16} /> Verified listeners</span>
                </div>
              </div>
            </section>

            <section className="featured-artist panel">
              <img src="https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=700&q=85" alt="Featured musician" />
              <div className="featured-artist-copy">
                <span className="eyebrow"><BadgeCheck size={14} /> FEATURED ARTIST</span>
                <h2>Emmanuel Jal</h2>
                <p>Artist, storyteller, and a powerful voice in South Sudanese music.</p>
                <button className="button secondary" onClick={() => { setQuery('Emmanuel Jal'); document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }); }}>
                  <Headphones size={15} /> Explore artist
                </button>
              </div>
              <div className="artist-sparkle"><Sparkles size={24} /></div>
            </section>

            <section className="genre-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">EXPLORE</span>
                  <h2><Compass size={22} /> Explore Juba Genres</h2>
                </div>
              </div>

              <div className="genre-grid">
                {genres.map((genre) => {
                  const count = catalogTracks.filter((track) => track.genre.toLowerCase().includes(genre.filter.toLowerCase())).length;
                  return (
                    <button key={genre.name} className={`genre-card ${genre.color} ${genreFilter === genre.filter ? 'selected' : ''}`} onClick={() => selectGenre(genre.filter)}>
                      <strong>{genre.name}</strong>
                      <span>{count} sample {count === 1 ? 'track' : 'tracks'}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="featured-playlists">
              <div className="section-heading compact-heading">
                <div>
                  <span className="eyebrow">CURATED FOR YOU</span>
                  <h2><Sparkles size={22} /> Featured playlists</h2>
                </div>
              </div>

              <div className="playlist-grid">
                {featuredPlaylists.map((playlist) => {
                  const count = catalogTracks.filter((track) => track.genre.toLowerCase().includes(playlist.genre.toLowerCase())).length;
                  return (
                    <article key={playlist.id} className={`playlist-card ${playlist.accent}`}>
                      <div className="playlist-art" style={{ backgroundImage: `url(${playlist.cover})` }}>
                        <span className="playlist-tag">{count} sample {count === 1 ? 'track' : 'tracks'}</span>
                        <button className="playlist-play" onClick={() => openPlaylist(playlist, true)} aria-label={`Play ${playlist.name}`}>
                          <Play size={18} fill="currentColor" />
                        </button>
                      </div>
                      <div className="playlist-body">
                        <strong>{playlist.name}</strong>
                        <small>{playlist.subtitle}</small>
                        <button className="button secondary playlist-button" onClick={() => openPlaylist(playlist)}>Explore mix</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="trending-section" id="catalog">
              <div className="now-trending-ticker" aria-label="Now trending community sample previews">
                <span>♪ NOW TRENDING · JUBA CITY LIGHTS · WHITE NILE GROOVE · PEACE IN SOUTH SUDAN · SAMPLE PREVIEWS</span>
              </div>

              <div className="section-heading">
                <div>
                  <span className="eyebrow">THE JUNUBIFY CATALOG</span>
                  <h2><TrendingUp size={22} /> Trending tracks in Juba</h2>
                </div>
                <span className="muted">
                  {genreFilter && <button className="clear-filter" onClick={() => setGenreFilter('')}>Clear genre · </button>}
                  {visibleTracks.length} tracks
                </span>
              </div>

              <div className="hot-badge"><span aria-hidden="true">✦</span> HOT RIGHT NOW</div>

              {!tracks.length && <p className="catalog-status">Sample previews · connect Supabase for the live catalog</p>}
              {loadingCatalog && <p className="muted catalog-status">Loading the published catalog…</p>}
              {catalogError && (
                <div className="notice-box">
                  <b>Catalog unavailable</b>
                  <p>{catalogError}</p>
                  <button className="button secondary" onClick={refreshCatalog}>Try again</button>
                </div>
              )}

              <section className="track-list">
                {visibleTracks.map((track, index) => (
                  <article className="track-row" key={track.id}>
                    <span className="track-number">{String(index + 1).padStart(2, '0')}</span>
                    <button className="track-art" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}>
                      <img src={track.cover || fallbackCover} alt="" />
                    </button>
                    <div className="track-meta">
                      <strong>{track.title}</strong>
                      <span>{track.artist} · {track.genre}</span>
                    </div>
                    <div className="track-stats">
                      <span><Heart size={14} /> {Number(track.plays || 0).toLocaleString()}</span>
                      <button className="mini-play" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}>
                        {playing?.id === track.id && audioRef.current && !audioRef.current.paused ? <Pause size={15} /> : <Play size={15} />}
                      </button>
                      <button className={`track-action ${likedTracks[track.id] ? 'liked' : ''}`} onClick={() => toggleLike(track.id)} aria-label={likedTracks[track.id] ? `Unlike ${track.title}` : `Like ${track.title}`}>
                        <Heart size={17} fill={likedTracks[track.id] ? 'currentColor' : 'none'} />
                      </button>
                      <button className="track-action" onClick={() => shareTrack(track)} aria-label={`Share ${track.title}`}>
                        <Upload size={17} />
                      </button>
                    </div>
                  </article>
                ))}
              </section>

              {!visibleTracks.length && (
                <div className="panel empty-catalog">
                  <Music2 size={26} />
                  <b>No tracks match this filter.</b>
                  <span>Choose another genre or clear your search.</span>
                </div>
              )}
            </section>

            <section className="upload-promo">
              <div>
                <span className="eyebrow">ARE YOU AN ARTIST?</span>
                <h2>Bring your sound to Junubify.</h2>
                <p>Submit your music securely for review in Artist Studio.</p>
              </div>
              <button className="button primary" onClick={() => setTab('studio')}><Upload size={16} /> Open studio</button>
            </section>
          </>
        )}

        {tab === 'studio' && (
          <>
            <section className="section-heading">
              <div>
                <span className="eyebrow">ARTIST PORTAL</span>
                <h1>Artist studio</h1>
                <p className="muted">Submit a track for review. Audio files are stored in a secure Supabase bucket with review status tracking.</p>
              </div>
            </section>

            <section className="panel studio-panel">
              {!session?.user ? (
                <form className="auth-card" onSubmit={requestSignIn}>
                  <h2>Receive a secure sign-in link</h2>
                  <label>
                    Work email
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="artist@junubify.com" required />
                  </label>
                  <button className="button primary" type="submit">Send magic link</button>
                </form>
              ) : (
                <>
                  <div className="signed-in-bar">
                    <div>
                      <strong>{session.user.email}</strong>
                      <span>Signed in as artist</span>
                    </div>
                    <button className="button secondary" onClick={signOut}>Sign out</button>
                  </div>

                  <form className="submit-form" onSubmit={publishTrack}>
                    <label>
                      Song title
                      <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Juba Morning" required />
                    </label>
                    <label>
                      Artist name
                      <input value={form.artist} onChange={(event) => setForm({ ...form, artist: event.target.value })} placeholder="Your stage name" required />
                    </label>
                    <label>
                      Genre
                      <select value={form.genre} onChange={(event) => setForm({ ...form, genre: event.target.value })}>
                        {genres.map((genre) => <option key={genre.filter} value={genre.filter}>{genre.name}</option>)}
                      </select>
                    </label>
                    <label>
                      Album or single
                      <input value={form.album} onChange={(event) => setForm({ ...form, album: event.target.value })} placeholder="Single" />
                    </label>
                    <label>
                      Cover image URL
                      <input value={form.cover} onChange={(event) => setForm({ ...form, cover: event.target.value })} placeholder="https://..." />
                    </label>

                    <div className="upload-box">
                      <label className="file-picker">
                        <input type="file" accept="audio/*" onChange={(event) => handleFile(event.target.files?.[0])} />
                        <span>{selectedFile ? selectedFile.name : 'Choose audio file'}</span>
                      </label>
                    </div>

                    <label className="checkbox-row">
                      <input type="checkbox" checked={rightsConfirmed} onChange={() => setRightsConfirmed((value) => !value)} />
                      I confirm that I own or control the rights to this audio and have permission to upload it.
                    </label>

                    <button className="button primary" type="submit" disabled={submitting}>
                      {submitting ? 'Submitting…' : 'Submit track for review'}
                    </button>
                  </form>
                </>
              )}
            </section>
          </>
        )}

        {tab === 'monetize' && (
          <>
            <section className="section-heading">
              <div>
                <span className="eyebrow">CREATOR ECONOMY</span>
                <h1>Monetization</h1>
                <p className="muted">Developing a secure creator payout system with payment provider integration and protected revenue flows.</p>
              </div>
            </section>

            <section className="panel monetization-panel">
              <div className="money-box">
                <Wallet size={22} />
                <div>
                  <strong>Payments are not live yet</strong>
                  <p>{paymentSetupMessage}</p>
                </div>
              </div>
              <div className="money-grid">
                <div className="mini-card">
                  <span>Royalties</span>
                  <strong>Coming soon</strong>
                </div>
                <div className="mini-card">
                  <span>Subscriptions</span>
                  <strong>Secure checkout</strong>
                </div>
                <div className="mini-card">
                  <span>Disbursements</span>
                  <strong>Provider-backed</strong>
                </div>
              </div>
            </section>
          </>
        )}

        {tab === 'download' && (
          <section className="app-download panel">
            <div className="download-icon"><Smartphone size={42} /></div>
            <span className="eyebrow">LISTEN WHEREVER YOU ARE</span>
            <h1>Get Junubify for Android & iOS</h1>
            <p>Use the installable web app to keep Junubify close. Native store downloads will be linked once the apps are published.</p>
            <div className="store-buttons">
              <div className="store-placeholder">
                <Download size={22} />
                <span><small>ANDROID APP</small><b>Coming soon</b></span>
              </div>
              <div className="store-placeholder">
                <Download size={22} />
                <span><small>APPLE APP</small><b>Coming soon</b></span>
              </div>
            </div>
            <div className="qr-placeholder" aria-label="Decorative QR-style pattern" role="img">
              {Array.from({ length: 64 }, (_, index) => <i key={index} className={(index * 7 + index % 3) % 4 === 0 ? 'qr-lit' : ''} />)}
            </div>
            <p className="muted">To install the current web app, use your browser menu and choose “Add to Home screen”.</p>
          </section>
        )}
      </main>

      <footer className="player">
        <div className="player-track">
          {playing ? (
            <>
              <img src={playing.cover || fallbackCover} alt="" />
              <div>
                <b>{playing.title}</b>
                <span>{playing.artist}</span>
              </div>
            </>
          ) : (
            <>
              <span className="player-note"><Music2 size={16} /></span>
              <div>
                <b>Nothing playing</b>
                <span>Pick a track to listen</span>
              </div>
            </>
          )}
        </div>

        <audio
          ref={audioRef}
          src={audioUrl || undefined}
          onEnded={() => {
            setPlaying(null);
            setAudioUrl('');
          }}
        />

        <button className="mini-play" onClick={() => playing && playTrack(playing)} aria-label="Toggle playback">
          {playing && audioRef.current && !audioRef.current.paused ? <Pause size={16} /> : <Play size={16} />}
        </button>
      </footer>

      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
