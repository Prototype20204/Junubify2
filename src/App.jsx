import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, AudioLines, BadgeCheck, Check, CircleDollarSign, Compass, CreditCard, Download, Headphones, Heart, Music2, Pause, Play, Radio, ShieldCheck, Smartphone, Sparkles, TrendingUp, Upload, Wallet, X } from 'lucide-react';
import { supabase, supabaseConfigured } from './lib/supabase.js';
import { createTrackAudioUrl, fetchAdminTracks, fetchArtistTracks, fetchPublishedTracks, submitTrack, updateTrackReviewStatus } from './lib/catalog.js';

const paymentSetupMessage = 'Checkout and payouts are not connected yet. Configure a payment provider and secure backend before accepting money or promising transfers.';
const paymentMethods = [
  { name: 'MTN', detail: 'Mobile money · South Sudan', type: 'mobile' },
  { name: 'ZAIN', detail: 'Mobile money · South Sudan', type: 'mobile' },
  { name: 'Digitel', detail: 'Mobile money · South Sudan', type: 'mobile' },
  { name: 'Credit card', detail: 'Card checkout', type: 'card' },
];
const productionAuthRedirectUrl = 'https://junubify-neon.vercel.app';
const productionVerificationRedirectUrl = `${productionAuthRedirectUrl}/auth/verified`;
const emptyForm = { title: '', artist: '', genre: 'Afrobeat', album: '', cover: '' };
const fallbackCover = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=500';
const samplePreviewDuration = 30;
const emailRateLimitMessage = 'Supabase is temporarily limiting confirmation emails. Its built-in sender allows only 2 emails per hour. Wait for the limit to reset or configure custom SMTP in Supabase Auth settings, then try again.';
const emailSenderSetupMessage = "Supabase's built-in email sender is for testing and may only send to project team members. Configure custom SMTP in Supabase Auth settings before requesting confirmation emails for other addresses.";
const emailDeliveryErrorMessage = 'Supabase could not send this email. Check that custom SMTP is enabled and the sender address belongs to your verified Resend domain, then review the Supabase Auth logs.';
const formatPlaybackTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const totalSeconds = Math.floor(seconds);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
};
const getAuthErrorMessage = (error, fallback, { emailDelivery = false } = {}) => {
  const message = error instanceof Error
    ? error.message
    : typeof error?.message === 'string' ? error.message : '';
  const status = typeof error?.status === 'number' ? error.status : null;

  if (/email rate limit exceeded/i.test(message) || (emailDelivery && status === 429)) {
    return emailRateLimitMessage;
  }
  if (/email address not authorized/i.test(message)) return emailSenderSetupMessage;
  if (emailDelivery && status >= 500) return emailDeliveryErrorMessage;
  return message && message !== '{}' ? message : fallback;
};
// Public audio samples are previews for the UI, not official South Sudanese releases.
const demoTracks = [
  { id: 'demo-1', title: 'Juba City Lights (Preview)', artist: 'Junubify Sample', genre: 'Afrobeat', plays: 124500, cover: fallbackCover, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'demo-2', title: 'White Nile Groove (Preview)', artist: 'Junubify Sample', genre: 'Dancehall', plays: 98200, cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'demo-3', title: 'Peace in South Sudan (Preview)', artist: 'Junubify Sample', genre: 'Hip-Hop', plays: 215800, cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: 'demo-4', title: 'Bahr el Ghazal Breeze (Preview)', artist: 'Junubify Sample', genre: 'Traditional & Cultural', plays: 68400, cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: 'demo-5', title: 'Custom Bus Dance (Preview)', artist: 'Junubify Sample', genre: 'Afro-Pop', plays: 57300, cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
  { id: 'demo-6', title: 'Daybreak in Juba (Preview)', artist: 'Junubify Sample', genre: 'Afrobeat', cover: fallbackCover, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'demo-7', title: 'Nile Market Rhythm (Preview)', artist: 'Junubify Sample', genre: 'Afrobeat', cover: fallbackCover, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: 'demo-8', title: 'Drum Circle at Sunset (Preview)', artist: 'Junubify Sample', genre: 'Traditional & Cultural', cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
  { id: 'demo-9', title: 'Songs of the Nile (Preview)', artist: 'Junubify Sample', genre: 'Traditional & Cultural', cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'demo-10', title: 'New Dawn Cypher (Preview)', artist: 'Junubify Sample', genre: 'Hip-Hop', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: 'demo-11', title: 'Juba Verse (Preview)', artist: 'Junubify Sample', genre: 'Hip-Hop', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
  { id: 'demo-12', title: 'Juba Dancehall Nights (Preview)', artist: 'Junubify Sample', genre: 'Dancehall', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'demo-13', title: 'Moonlight on the Nile (Preview)', artist: 'Junubify Sample', genre: 'Dancehall', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: 'demo-14', title: 'Grace over Juba (Preview)', artist: 'Junubify Sample', genre: 'Gospel & Choir', cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'demo-15', title: 'Voices of Hope (Preview)', artist: 'Junubify Sample', genre: 'Gospel & Choir', cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: 'demo-16', title: 'Sunday Morning in Wau (Preview)', artist: 'Junubify Sample', genre: 'Gospel & Choir', cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
];
const genres = [
  { name: 'Juba Afrobeat', filter: 'Afrobeat', subtitle: 'Modern rhythms from Juba and beyond', color: 'genre-green', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=800' },
  { name: 'Traditional & Cultural', filter: 'Traditional', subtitle: 'Heritage sounds and cultural rhythms', color: 'genre-orange', cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=800' },
  { name: 'South Sudan Hip-Hop', filter: 'Hip-Hop', subtitle: 'Stories and bars from across South Sudan', color: 'genre-purple', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800' },
  { name: 'Reggae & Dancehall', filter: 'Dancehall', subtitle: 'Island rhythms with a South Sudan sound', color: 'genre-red', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800' },
  { name: 'Gospel & Choir', filter: 'Gospel', subtitle: 'Choirs and voices from home', color: 'genre-blue', cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=800' },
];
const featuredPlaylists = [
  { id: 'playlist-1', name: 'Juba Nights', subtitle: 'Late-night energy', accent: 'forest', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=800', genre: 'Afrobeat' },
  { id: 'playlist-2', name: 'Nile Sunrise', subtitle: 'Warm rhythms', accent: 'gold', cover: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&q=80&w=800', genre: 'Traditional' },
  { id: 'playlist-3', name: 'Unity Mix', subtitle: 'Cross-city favorites', accent: 'sunset', cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=800', genre: 'Hip-Hop' },
  { id: 'playlist-4', name: 'Bassline South', subtitle: 'Dance all night', accent: 'deep', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800', genre: 'Dancehall' },
];

function PlaylistDetail({ playlist, tracks, playing, isPlaying, onBack, onPlayTrack, emptyMessage, kind = 'playlist' }) {
  const isGenre = kind === 'genre';
  return (
    <section className="playlist-detail">
      <button className="playlist-detail-back" onClick={onBack}><ArrowLeft size={16}/> {isGenre ? 'Back to genres' : 'Back to Discover'}</button>
      <section className="playlist-detail-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(7, 14, 10, .94), rgba(7, 14, 10, .35)), url(${playlist.cover})` }}>
        <span className="eyebrow">{isGenre ? 'GENRE COLLECTION' : 'FEATURED PLAYLIST'}</span>
        <h1>{playlist.name}</h1>
        <p>{playlist.subtitle}</p>
        <span className="playlist-detail-count">{tracks.length} {tracks.length === 1 ? 'song' : 'songs'}</span>
        <button className="button primary" onClick={() => tracks[0] && onPlayTrack(tracks[0])}><Play size={16} fill="currentColor"/> Play {isGenre ? 'genre' : 'playlist'}</button>
      </section>
      <div className="playlist-detail-heading"><div><span className="eyebrow">{isGenre ? 'IN THIS GENRE' : 'IN THIS PLAYLIST'}</span><h2>Tracks</h2></div><span className="muted">{tracks.length} songs</span></div>
      {tracks.length ? <section className="track-list">{tracks.map((track, index) => {
        const trackIsPlaying = playing?.id === track.id && isPlaying;
        return <article className="track-row" key={track.id}><span className="track-number">{String(index + 1).padStart(2, '0')}</span><button className="track-art" onClick={() => onPlayTrack(track)} aria-label={`Play ${track.title}`}><img src={track.cover || fallbackCover} alt=""/></button><div className="track-meta"><strong>{track.title}</strong><span>{track.artist} · {track.genre}</span></div><div className="track-stats"><span>{track.id.startsWith('demo-') ? '30 sec sample' : 'Track'}</span><button className="mini-play" onClick={() => onPlayTrack(track)} aria-label={`${trackIsPlaying ? 'Pause' : 'Play'} ${track.title}`}>{trackIsPlaying ? <Pause size={15}/> : <Play size={15}/>}</button></div></article>;
      })}</section> : <p className="muted">{emptyMessage}</p>}
    </section>
  );
}

export default function App() {
  const isVerificationRoute = window.location.pathname === '/auth/verified';
  const [tab, setTab] = useState(isVerificationRoute ? 'verified' : 'discover');
  const [tracks, setTracks] = useState([]);
  const [artistTracks, setArtistTracks] = useState([]);
  const [query, setQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [expandedGenre, setExpandedGenre] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [playQueue, setPlayQueue] = useState([]);
  const [notice, setNotice] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authMode, setAuthMode] = useState('signin');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [accountCreated, setAccountCreated] = useState(false);
  const [createdEmail, setCreatedEmail] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(isVerificationRoute ? 'checking' : 'idle');
  const [verificationError, setVerificationError] = useState('');
  const [session, setSession] = useState(null);
  const [isTrackAdmin, setIsTrackAdmin] = useState(false);
  const [adminTracks, setAdminTracks] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [reviewingTrackId, setReviewingTrackId] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [playbackTime, setPlaybackTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [likedTracks, setLikedTracks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('junubify-liked-tracks') || '{}'); } catch { return {}; }
  });
  const audioRef = useRef(null);
  const noticeTimerRef = useRef(null);
  const sampleEndHandledRef = useRef(false);

  const notify = (message) => {
    setNotice(message);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(''), 5000);
  };

  useEffect(() => () => window.clearTimeout(noticeTimerRef.current), []);

  useEffect(() => {
    if (!supabase) {
      if (isVerificationRoute) {
        setVerificationStatus('error');
        setVerificationError('Email verification is unavailable because the authentication service is not configured.');
      }
      return undefined;
    }

    const callbackParams = new URLSearchParams(window.location.hash.slice(1) || window.location.search.slice(1));
    const callbackError = callbackParams.get('error_description');
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        notify(error.message);
        if (isVerificationRoute) {
          setVerificationStatus('error');
          setVerificationError(error.message);
        }
        return;
      }
      const currentSession = data?.session ?? null;
      setSession(currentSession);
      if (isVerificationRoute && !callbackError) {
        if (currentSession) setVerificationStatus('success');
        else {
          setVerificationStatus('error');
          setVerificationError('This verification link may have expired or already been used. Request a new link and try again.');
        }
      }
    }).catch((error) => {
      if (!active) return;
      const message = error instanceof Error ? error.message : 'Could not restore your sign-in session.';
      notify(message);
      if (isVerificationRoute) {
        setVerificationStatus('error');
        setVerificationError(message);
      }
    });
    if (callbackError && isVerificationRoute) {
      setVerificationStatus('error');
      setVerificationError(callbackError.replace(/\+/g, ' '));
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (isVerificationRoute && !callbackError && nextSession && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION')) {
        setVerificationStatus('success');
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshCatalog = async () => {
    if (!supabaseConfigured) return;
    setLoadingCatalog(true);
    setCatalogError('');
    try {
      const publicTracks = await fetchPublishedTracks();
      setTracks(publicTracks);
      if (session?.user?.id) setArtistTracks(await fetchArtistTracks(session.user.id));
      else setArtistTracks([]);
    } catch (error) {
      setCatalogError(error.message || 'Could not load the catalog.');
    } finally {
      setLoadingCatalog(false);
    }
  };
  useEffect(() => { refreshCatalog(); }, [session?.user?.id]);

  useEffect(() => {
    let active = true;
    if (!session?.user?.id || !supabase) {
      setIsTrackAdmin(false);
      setAdminTracks([]);
      setAdminError('');
      return () => { active = false; };
    }

    const checkAdminAccess = async () => {
      try {
        const { data, error } = await supabase.rpc('is_track_admin');
        if (!active) return;
        if (error) throw error;
        setIsTrackAdmin(data === true);
        setAdminTracks([]);
        setAdminError('');
      } catch (error) {
        if (!active) return;
        setIsTrackAdmin(false);
        const message = error?.message || 'Could not verify administrator access.';
        setAdminError(message);
        notify(message);
      }
    };
    checkAdminAccess();

    return () => { active = false; };
  }, [session?.user?.id]);

  const refreshAdminQueue = async () => {
    if (!isTrackAdmin) return;
    setAdminLoading(true);
    setAdminError('');
    try {
      setAdminTracks(await fetchAdminTracks());
    } catch (error) {
      setAdminError(error.message || 'Could not load submissions for review.');
    } finally {
      setAdminLoading(false);
    }
  };
  useEffect(() => { refreshAdminQueue(); }, [isTrackAdmin]);

  useEffect(() => {
    if (!isTrackAdmin && tab === 'admin') setTab('studio');
  }, [isTrackAdmin, tab]);

  const reviewTrack = async (trackId, status) => {
    setReviewingTrackId(trackId);
    setAdminError('');
    try {
      await updateTrackReviewStatus(trackId, status);
      setAdminTracks((current) => current.filter((track) => track.id !== trackId));
      await refreshCatalog();
      notify(status === 'published' ? 'Track approved and published.' : 'Track rejected. It remains private.');
    } catch (error) {
      setAdminError(error?.message || 'Could not update the submission review status.');
    } finally {
      setReviewingTrackId('');
    }
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!/\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name) && !file.type.startsWith('audio/')) return notify('Choose an audio file such as MP3, WAV, M4A, OGG, AAC, or FLAC.');
    if (file.size > 50 * 1024 * 1024) return notify('Audio file must be 50 MB or smaller.');
    setSelectedFile(file);
  };

  const authRedirectUrl = import.meta.env.DEV
    ? import.meta.env.VITE_AUTH_REDIRECT_URL?.trim() || window.location.origin
    : productionAuthRedirectUrl;
  const verificationRedirectUrl = import.meta.env.DEV
    ? new URL('/auth/verified', authRedirectUrl).toString()
    : productionVerificationRedirectUrl;

  const leaveVerificationPage = () => {
    window.history.replaceState(null, '', '/');
    setVerificationStatus('idle');
    setVerificationError('');
    setTab('studio');
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    if (!supabase) {
      setAuthError('Connect Supabase before creating an account or signing in.');
      return;
    }
    if (authMode === 'signup' && password !== confirmPassword) {
      setAuthError('Your passwords do not match.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthMessage('');
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: verificationRedirectUrl },
        });
        if (error) throw error;

        const normalizedEmail = email.trim();
        setCreatedEmail(normalizedEmail);
        setAccountCreated(true);
        setAuthMessage(data.session
          ? 'Your account is ready. You are signed in.'
          : 'Your artist account has been created. Please verify your email address to complete setup.');

        if (!data.session) {
          setPassword('');
          setConfirmPassword('');
          setAuthMode('signin');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setAccountCreated(false);
        setCreatedEmail('');
        setAuthMessage('You are signed in and can submit music for review.');
      }
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, 'Authentication failed. Please try again.', {
        emailDelivery: authMode === 'signup',
      }));
    } finally {
      setAuthLoading(false);
    }
  };

  const sendSignInLink = async () => {
    if (!supabase) {
      setAuthError('Connect Supabase before creating an account or signing in.');
      return;
    }
    if (!email.trim()) {
      setAuthError('Enter your email address to receive a sign-in link.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthMessage('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false, emailRedirectTo: authRedirectUrl },
      });
      if (error) throw error;
      setAuthMessage('Check your inbox for a secure sign-in link.');
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, 'Could not send a sign-in link. Please try again.', { emailDelivery: true }));
    } finally {
      setAuthLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    if (!supabase) {
      setAuthError('Connect Supabase before requesting another verification email.');
      return;
    }
    if (!createdEmail && !email.trim()) {
      setAuthError('Enter your email address to receive a verification email.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthMessage('');
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: createdEmail || email.trim(),
        options: { emailRedirectTo: verificationRedirectUrl },
      });
      if (error) throw error;
      setAuthMessage('A new verification email has been sent. Check your inbox, including your spam folder.');
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, 'Could not resend the verification email. Please try again.', { emailDelivery: true }));
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) notify(error.message);
    else notify('You have signed out.');
  };

  const publishTrack = async (event) => {
    event.preventDefault();
    if (!session?.user) return notify('Sign in to submit a track.');
    if (!selectedFile) return notify('Choose an audio file before submitting.');
    if (!rightsConfirmed) return notify('Confirm that you own or control the rights to this audio.');
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
  const isSamplePreview = playing?.id?.startsWith('demo-') ?? false;
  const playerDuration = isSamplePreview ? samplePreviewDuration : audioDuration;
  const matchesQuery = (track) => `${track.title} ${track.artist} ${track.genre}`.toLowerCase().includes(query.toLowerCase());
  const selectedPlaylistTracks = selectedPlaylist
    ? catalogTracks.filter((track) => track.genre.toLowerCase().includes(selectedPlaylist.genre.toLowerCase()) && matchesQuery(track))
    : [];
  const selectedGenreTracks = selectedGenre
    ? catalogTracks.filter((track) => track.genre.toLowerCase().includes(selectedGenre.filter.toLowerCase()) && matchesQuery(track))
    : [];
  const visibleTracks = catalogTracks.filter((track) => {
    return matchesQuery(track) && (!genreFilter || track.genre.toLowerCase().includes(genreFilter.toLowerCase()));
  });

  useEffect(() => {
    if (!audioUrl || !playing || !audioRef.current) return;
    audioRef.current.play().catch(() => notify('Playback could not start. Tap play again or check your connection.'));
  }, [audioUrl, playing]);

  const playTrack = async (track, queuedTracks = []) => {
    setPlayQueue(queuedTracks);
    if (playing?.id === track.id && audioRef.current) {
      if (audioRef.current.paused) {
        if (track.id.startsWith('demo-') && audioRef.current.currentTime >= samplePreviewDuration) {
          audioRef.current.currentTime = 0;
          setPlaybackTime(0);
          sampleEndHandledRef.current = false;
        }
        audioRef.current.play().catch(() => notify('Could not play this audio file.'));
      }
      else audioRef.current.pause();
      return;
    }
    try {
      const url = track.audioPath ? await createTrackAudioUrl(track.audioPath) : track.audioUrl;
      if (!url) return notify('Audio is not available for this track.');
      setPlaybackTime(0);
      setAudioDuration(0);
      sampleEndHandledRef.current = false;
      setAudioUrl(url);
      setPlaying(track);
    } catch (error) {
      notify(error.message || 'Could not create a secure audio playback link.');
    }
  };

  const playAllTracks = (tracksToPlay) => {
    if (!tracksToPlay.length) return;
    playTrack(tracksToPlay[0], tracksToPlay.slice(1));
  };

  const advancePlayback = (keepFinishedSample = false) => {
    if (playQueue.length) {
      const [nextTrack, ...remainingTracks] = playQueue;
      playTrack(nextTrack, remainingTracks);
      return;
    }
    setPlayQueue([]);
    if (!keepFinishedSample) setPlaying(null);
    setPlaybackTime(keepFinishedSample ? samplePreviewDuration : 0);
  };

  const toggleLike = (trackId) => setLikedTracks((current) => {
    const next = { ...current, [trackId]: !current[trackId] };
    try { localStorage.setItem('junubify-liked-tracks', JSON.stringify(next)); } catch { /* Storage may be disabled. */ }
    return next;
  });

  const shareTrack = async (track) => {
    const url = `${window.location.origin}/?track=${encodeURIComponent(track.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: `${track.title} · Junubify`, text: `Listen to ${track.title} by ${track.artist} on Junubify`, url });
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); notify('Track link copied to clipboard.'); }
      else notify(url);
    } catch (error) { if (error.name !== 'AbortError') notify('Could not share this track.'); }
  };

  const openPlaylist = (playlist, autoplay = false) => {
    const matching = catalogTracks.filter((track) => track.genre.toLowerCase().includes(playlist.genre.toLowerCase()));
    if (!matching.length) return notify(`No ${playlist.name} songs are available yet.`);
    setSelectedGenre(null);
    setSelectedPlaylist(playlist);
    setGenreFilter('');
    setQuery('');
    if (autoplay) playTrack(matching[0]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openGenre = (genre) => {
    setSelectedPlaylist(null);
    setSelectedGenre(genre);
    setQuery('');
    setGenreFilter('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => { setSelectedPlaylist(null); setSelectedGenre(null); setTab('discover'); }} aria-label="Junubify home"><span className="brand-icon"><Radio size={21}/></span><span><b>JUNUBIFY</b><small>SOUTH SUDAN BEATS</small></span></button>
        <input className="search" value={query} onChange={(event) => { setQuery(event.target.value); setGenreFilter(''); }} placeholder="Search tracks or artists" aria-label="Search tracks or artists" />
        <nav className={`nav-tabs ${isTrackAdmin ? 'has-admin' : ''}`} aria-label="Main navigation">
          <button className={tab === 'discover' ? 'active' : ''} onClick={() => { setSelectedPlaylist(null); setSelectedGenre(null); setTab('discover'); }}><Headphones size={17}/> Discover</button>
          <button className={tab === 'studio' ? 'active' : ''} onClick={() => setTab('studio')}><Upload size={17}/> Artist studio</button>
          {isTrackAdmin && <button className={tab === 'admin' ? 'active' : ''} onClick={() => setTab('admin')}><ShieldCheck size={17}/> Admin review</button>}
          <button className={tab === 'monetize' ? 'active' : ''} onClick={() => setTab('monetize')}><CircleDollarSign size={17}/> Monetization</button>
          <button className={tab === 'download' ? 'active' : ''} onClick={() => setTab('download')}><Smartphone size={17}/> Get the app</button>
        </nav>
      </header>
      <main className="content">
        {tab === 'verified' && (
          <section className={`verification-landing ${verificationStatus === 'error' ? 'has-error' : ''}`} aria-live="polite">
            {verificationStatus === 'checking' ? (
              <>
                <span className="eyebrow success-tag">EMAIL VERIFICATION</span>
                <h1>Confirming your email</h1>
                <p>We’re securely completing your Junubify artist account setup. This should only take a moment.</p>
              </>
            ) : verificationStatus === 'success' ? (
              <>
                <span className="eyebrow success-tag">EMAIL VERIFIED</span>
                <h1>You’re ready to make music with Junubify.</h1>
                <p>
                  {session?.user?.email ? <><strong>{session.user.email}</strong> is verified. </> : 'Your email address is verified. '}
                  Continue to Artist Studio to submit tracks and manage your music.
                </p>
                <button className="button primary" type="button" onClick={leaveVerificationPage}>Continue to Artist Studio</button>
              </>
            ) : (
              <>
                <span className="eyebrow verification-error-tag">VERIFICATION NOT COMPLETED</span>
                <h1>We couldn’t verify your email.</h1>
                <p>{verificationError || 'The verification link could not be completed. Request a fresh email and try again.'}</p>
                <button className="button primary" type="button" onClick={leaveVerificationPage}>Return to Artist Studio</button>
              </>
            )}
          </section>
        )}

        {tab === 'discover' && (selectedPlaylist ? <PlaylistDetail playlist={selectedPlaylist} tracks={selectedPlaylistTracks} playing={playing} isPlaying={Boolean(audioRef.current && !audioRef.current.paused)} onBack={() => setSelectedPlaylist(null)} onPlayTrack={playTrack} emptyMessage={query ? 'No songs match your search.' : 'No songs are available in this playlist yet.'}/> : selectedGenre ? <PlaylistDetail playlist={selectedGenre} tracks={selectedGenreTracks} playing={playing} isPlaying={Boolean(audioRef.current && !audioRef.current.paused)} onBack={() => setSelectedGenre(null)} onPlayTrack={playTrack} emptyMessage={query ? 'No songs match your search.' : 'No songs are available in this genre yet.'} kind="genre"/> : <>
          <section className="hero trend-hero"><div className="hero-copy"><span className="eyebrow"><AudioLines size={14}/> FEATURED JUBA PLAYLIST</span><h1>Top 50 South Sudan Trends</h1><p>Discover sounds from Juba, Wau, Malakal, and the diaspora. Explore community favorites and new releases.</p><div className="hero-actions"><button className="button primary hero-play" onClick={() => playAllTracks(visibleTracks)} disabled={!visibleTracks.length}><Play size={16} fill="currentColor"/> Play All <span>{visibleTracks.length}</span></button><button className="button secondary" onClick={() => setTab('studio')}><Upload size={16}/> Upload Song</button></div></div><div className="hero-badge"><BadgeCheck size={18}/> A home for local artists</div></section>

          <section className="featured-artist panel"><img src="https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=700&q=85" alt="Featured musician"/><div className="featured-artist-copy"><span className="eyebrow"><BadgeCheck size={14}/> FEATURED ARTIST</span><h2>Emmanuel Jal</h2><p>Artist, storyteller, and a powerful voice in South Sudanese music.</p><button className="button secondary" onClick={() => { setQuery('Emmanuel Jal'); document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }); }}><Headphones size={15}/> Explore artist</button></div><div className="artist-sparkle"><Sparkles size={24}/></div></section>

          <section className="genre-section"><div className="section-heading"><div><span className="eyebrow">EXPLORE</span><h2><Compass size={22}/> Explore Juba Genres</h2></div></div><div className="genre-grid">{genres.map((genre) => { const matchingTracks = catalogTracks.filter((track) => track.genre.toLowerCase().includes(genre.filter.toLowerCase())); const expanded = expandedGenre === genre.filter; return <article key={genre.name} className={`genre-card ${genre.color} ${expanded ? 'expanded' : ''}`}><button className="genre-toggle" style={{ backgroundImage: `linear-gradient(180deg, rgba(7, 14, 10, .2), rgba(7, 14, 10, .9)), url(${genre.cover})` }} aria-expanded={expanded} onClick={() => setExpandedGenre((current) => current === genre.filter ? null : genre.filter)}><strong>{genre.name}</strong><span>{matchingTracks.length} {matchingTracks.length === 1 ? 'track' : 'tracks'} · {expanded ? 'Hide songs' : 'View songs'}</span></button>{expanded && <><div className="genre-song-list">{matchingTracks.length ? matchingTracks.slice(0, 3).map((track) => <button key={track.id} className="genre-song" onClick={() => playTrack(track)} aria-label={`Play ${track.title} by ${track.artist}`}><span className="genre-song-copy"><strong>{track.title}</strong><small>{track.artist} · {track.genre}</small></span><Play size={15} fill="currentColor"/></button>) : <p className="genre-empty">No songs available yet.</p>}</div><button className="genre-explore" onClick={() => openGenre(genre)} aria-label={`Explore ${genre.name}`}><Compass size={14}/> Explore genre <ArrowRight size={14}/></button></>}</article>; })}</div></section>

          <section className="featured-playlists"><div className="section-heading compact-heading"><div><span className="eyebrow">CURATED FOR YOU</span><h2><Sparkles size={22}/> Featured playlists</h2></div></div><div className="playlist-grid">{featuredPlaylists.map((playlist) => { const count = catalogTracks.filter((track) => track.genre.toLowerCase().includes(playlist.genre.toLowerCase())).length; return <article key={playlist.id} className={`playlist-card ${playlist.accent}`}><div className="playlist-art" style={{ backgroundImage: `url(${playlist.cover})` }}><span className="playlist-tag">{count} sample {count === 1 ? 'track' : 'tracks'}</span><button className="playlist-play" onClick={() => openPlaylist(playlist, true)} aria-label={`Play ${playlist.name}`}><Play size={18} fill="currentColor"/></button></div><div className="playlist-body"><strong>{playlist.name}</strong><small>{playlist.subtitle}</small><button className="button secondary playlist-button" onClick={() => openPlaylist(playlist)}>Explore mix</button></div></article>; })}</div></section>

          <section className="trending-section" id="catalog"><div className="now-trending-ticker" aria-label="Now trending community sample previews"><span>♪ NOW TRENDING · JUBA CITY LIGHTS · WHITE NILE GROOVE · PEACE IN SOUTH SUDAN · SAMPLE PREVIEWS</span></div><div className="section-heading"><div><span className="eyebrow">THE JUNUBIFY CATALOG</span><h2><TrendingUp size={22}/> Trending tracks in Juba</h2></div><span className="muted">{genreFilter && <button className="clear-filter" onClick={() => setGenreFilter('')}>Clear genre · </button>}{visibleTracks.length} tracks</span></div><div className="hot-badge"><span aria-hidden="true">✦</span> HOT RIGHT NOW</div>{!tracks.length && <p className="catalog-status">Sample previews · connect Supabase for the live catalog</p>}{loadingCatalog && <p className="muted catalog-status">Loading the published catalog…</p>}{catalogError && <div className="notice-box"><b>Catalog unavailable</b><p>{catalogError}</p><button className="button secondary" onClick={refreshCatalog}>Try again</button></div>}<section className="track-list">{visibleTracks.map((track, index) => <article className="track-row" key={track.id}><span className="track-number">{String(index + 1).padStart(2, '0')}</span><button className="track-art" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}><img src={track.cover || fallbackCover} alt=""/></button><div className="track-meta"><strong>{track.title}</strong><span>{track.artist} · {track.genre}</span></div><div className="track-stats"><span><Heart size={14}/> {Number(track.plays || 0).toLocaleString()}</span><button className="mini-play" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}>{playing?.id === track.id && audioRef.current && !audioRef.current.paused ? <Pause size={15}/> : <Play size={15}/>}</button><button className={`track-action ${likedTracks[track.id] ? 'liked' : ''}`} onClick={() => toggleLike(track.id)} aria-label={likedTracks[track.id] ? `Unlike ${track.title}` : `Like ${track.title}`}><Heart size={17} fill={likedTracks[track.id] ? 'currentColor' : 'none'}/></button><button className="track-action" onClick={() => shareTrack(track)} aria-label={`Share ${track.title}`}><Upload size={17}/></button></div></article>)}</section>{!visibleTracks.length && <div className="panel empty-catalog"><Music2 size={26}/><b>No tracks match this filter.</b><span>Choose another genre or clear your search.</span></div>}</section>
          <section className="upload-promo"><div><span className="eyebrow">ARE YOU AN ARTIST?</span><h2>Bring your sound to Junubify.</h2><p>Submit your music securely for review in Artist Studio.</p></div><button className="button primary" onClick={() => setTab('studio')}><Upload size={16}/> Open studio</button></section>
        </>)}

        {tab === 'studio' && (
          <>
            <section className="section-heading">
              <div>
                <span className="eyebrow">ARTIST PORTAL</span>
                <h1>Artist studio</h1>
                <p className="muted">Submit a track for review. Audio is stored privately until approved.</p>
              </div>
            </section>
            {!supabaseConfigured && (
              <div className="notice-box prominent">
                <b>Backend setup required</b>
                <p>Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then apply the Supabase migrations to enable uploads.</p>
              </div>
            )}
            {!session ? (
              <section className="panel studio-auth">
                <span className="eyebrow">ARTIST ACCOUNT</span>
                <h2>{accountCreated ? 'Account created' : authMode === 'signup' ? 'Create your artist account' : 'Welcome back'}</h2>
                <p className="auth-intro">
                  {accountCreated
                    ? 'One quick step remains before you can access your Artist Studio.'
                    : authMode === 'signup'
                    ? 'Join Junubify to share your music with listeners across South Sudan and the diaspora.'
                    : 'Sign in to manage your submissions and share your sound.'}
                </p>
                {!accountCreated && <div className="auth-mode-switch" role="tablist" aria-label="Artist account options">
                  <button
                    className={authMode === 'signin' ? 'selected' : ''}
                    type="button"
                    role="tab"
                    aria-selected={authMode === 'signin'}
                    onClick={() => {
                      setAuthMode('signin');
                      setAccountCreated(false);
                      setPassword('');
                      setConfirmPassword('');
                      setAuthError('');
                      setAuthMessage('');
                    }}
                  >
                    Sign in
                  </button>
                  <button
                    className={authMode === 'signup' ? 'selected' : ''}
                    type="button"
                    role="tab"
                    aria-selected={authMode === 'signup'}
                    onClick={() => {
                      setAuthMode('signup');
                      setAccountCreated(false);
                      setPassword('');
                      setConfirmPassword('');
                      setAuthError('');
                      setAuthMessage('');
                    }}
                  >
                    Create account
                  </button>
                </div>}
                {accountCreated ? (
                  <div className="auth-success-page" role="status" aria-live="polite">
                    <div className="auth-success-hero">
                      <span className="eyebrow success-tag">EMAIL VERIFICATION</span>
                      <h3>Welcome to Junubify</h3>
                      <p>
                        Your artist account for <strong>{createdEmail || email}</strong> is almost ready.
                        Please verify your email address to unlock your Artist Studio and start managing your submissions.
                      </p>
                    </div>

                    <div className="auth-success-grid">
                      <div className="success-panel">
                        <span className="panel-label">Next steps</span>
                        <ul>
                          <li>Check your inbox for the verification email</li>
                          <li>Confirm your address in one click</li>
                          <li>Return here to sign in and upload your music</li>
                        </ul>
                      </div>

                      <div className="success-panel emphasis">
                        <span className="panel-label">What you can do after verification</span>
                        <ul>
                          <li>Submit tracks for private review</li>
                          <li>Track review status and release progress</li>
                          <li>Share your sound with listeners worldwide</li>
                        </ul>
                      </div>
                    </div>

                    <div className="auth-success-actions">
                      <button
                        className="button primary"
                        type="button"
                        onClick={() => {
                          setAuthMode('signin');
                          setAccountCreated(false);
                          setAuthMessage('');
                          setAuthError('');
                        }}
                      >
                        Back to sign in
                      </button>
                      <button
                        className="button secondary"
                        type="button"
                        onClick={resendVerificationEmail}
                        disabled={authLoading || !supabaseConfigured}
                      >
                        {authLoading ? 'Sending…' : 'Resend verification email'}
                      </button>
                    </div>
                    {authError && <p className="auth-feedback error" role="alert">{authError}</p>}
                    {authMessage && <p className="auth-feedback success" role="status">{authMessage}</p>}
                  </div>
                ) : (
                  <form className="auth-form" onSubmit={submitAuth}>
                    <label>
                      Email address
                      <input
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                      />
                    </label>
                    <label>
                      Password
                      <input
                        type="password"
                        autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                        minLength={8}
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="At least 8 characters"
                      />
                    </label>
                    {authMode === 'signup' && (
                      <label>
                        Confirm password
                        <input
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          required
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          placeholder="Re-enter your password"
                        />
                      </label>
                    )}
                    {authError && <p className="auth-feedback error" role="alert">{authError}</p>}
                    {authMessage && <p className="auth-feedback success" role="status">{authMessage}</p>}
                    <button className="button primary full" type="submit" disabled={authLoading || !supabaseConfigured}>
                      {authLoading ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Sign in'}
                    </button>
                    {authMode === 'signin' && (
                      <button className="auth-link-button" type="button" onClick={sendSignInLink} disabled={authLoading || !supabaseConfigured}>
                        Email me a secure sign-in link
                      </button>
                    )}
                  </form>
                )}
                {!accountCreated && <p className="auth-footnote">
                  {authMode === 'signup'
                    ? 'We’ll email you a verification link. Verify your address to finish creating your account.'
                    : 'New artists need to verify their email before their first sign-in.'}
                </p>}
              </section>
            ) : (
              <>
                <div className="studio-account">
                  <span>Signed in as <b>{session.user.email}</b></span>
                  <button className="button secondary" onClick={signOut}>Sign out</button>
                </div>
                <div className="studio-grid">
                  <form className="panel upload-form" onSubmit={publishTrack}>
                    <h2><Upload size={19}/> Submit a song</h2>
                    <p className="muted">MP3, WAV, M4A, OGG, AAC, or FLAC · up to 50 MB</p>
                    <label>Song title<input required maxLength="100" value={form.title} onChange={(event) => setForm({...form, title: event.target.value})} placeholder="e.g. Nile Sunset"/></label>
                    <label>Artist name<input required maxLength="100" value={form.artist} onChange={(event) => setForm({...form, artist: event.target.value})} placeholder="Your artist name"/></label>
                    <label>Genre<select value={form.genre} onChange={(event) => setForm({...form, genre: event.target.value})}><option>Afrobeat</option><option>Dancehall</option><option>Hip-Hop</option><option>Traditional &amp; Cultural</option><option>Gospel &amp; Choir</option><option>Afro-Pop</option></select></label>
                    <label>Album / release name<input maxLength="100" value={form.album} onChange={(event) => setForm({...form, album: event.target.value})} placeholder="Single"/></label>
                    <label>Cover image URL <span className="muted">(optional)</span><input type="url" value={form.cover} onChange={(event) => setForm({...form, cover: event.target.value})} placeholder="https://"/></label>
                    <label className="file-picker"><Music2 size={21}/><span><b>{selectedFile ? selectedFile.name : 'Choose audio file'}</b><small>{selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` : 'Audio file · up to 50 MB'}</small></span><input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac" onChange={(event) => handleFile(event.target.files?.[0])}/></label>
                    <label className="rights-confirm"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)}/><span>I confirm that I own or control the rights to this audio.</span></label>
                    <button className="button primary full" type="submit" disabled={submitting || !supabaseConfigured}><Upload size={16}/>{submitting ? 'Uploading securely…' : 'Submit for review'}</button>
                    <p className="fine-print">Submissions remain private until approved.</p>
                  </form>
                  <section className="panel catalog-panel">
                    <div className="catalog-title">
                      <h2>Your submissions</h2>
                      <button className="button secondary" onClick={refreshCatalog}>Refresh</button>
                    </div>
                    {artistTracks.length ? artistTracks.map((track) => (
                      <div className="mini-track" key={track.id}>
                        <img src={track.cover} alt=""/>
                        <div>
                          <strong>{track.title}</strong>
                          <span>{track.artist} · {track.status.replace('_', ' ')}</span>
                        </div>
                        {track.status === 'published' && <button className="mini-play" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}><Play size={14}/></button>}
                      </div>
                    )) : (
                      <div className="catalog-empty">
                        <div className="empty-icon"><Music2 size={22}/></div>
                        <p><strong>Your submissions will appear here</strong></p>
                        <small>Submit a track to add it to your private artist catalog.</small>
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}
          </>
        )}

        {tab === 'admin' && isTrackAdmin && (
          <>
            <section className="section-heading">
              <div>
                <span className="eyebrow">ADMINISTRATION</span>
                <h1>Track review</h1>
                <p className="muted">Preview each private submission, then approve it for publication or reject it.</p>
              </div>
            </section>
            <section className="panel admin-review">
              <div className="admin-review-heading">
                <div>
                  <h2>Pending submissions</h2>
                  <p className="muted">{adminTracks.length} awaiting review · audio remains private until approved</p>
                </div>
                <button className="button secondary" onClick={refreshAdminQueue} disabled={adminLoading}>
                  {adminLoading ? 'Refreshing…' : 'Refresh queue'}
                </button>
              </div>
              {adminError && <div className="notice-box" role="alert">{adminError}</div>}
              {adminLoading ? (
                <p className="muted">Loading submissions…</p>
              ) : adminTracks.length ? (
                <div className="admin-review-list">
                  {adminTracks.map((track) => (
                    <article className="admin-review-card" key={track.id}>
                      <img src={track.cover} alt="" />
                      <div className="admin-review-copy">
                        <span className="eyebrow">PENDING REVIEW</span>
                        <h3>{track.title}</h3>
                        <p>{track.artist} · {track.genre}{track.album ? ` · ${track.album}` : ''}</p>
                        <small>Submitted {new Date(track.createdAt).toLocaleString()} · {track.fileName}</small>
                      </div>
                      <div className="admin-review-actions">
                        <button className="button secondary" onClick={() => playTrack(track)} aria-label={`Preview ${track.title}`}>
                          <Play size={15} /> Preview
                        </button>
                        <button className="button primary" onClick={() => reviewTrack(track.id, 'published')} disabled={Boolean(reviewingTrackId)}>
                          <Check size={15} /> Approve &amp; publish
                        </button>
                        <button className="button danger" onClick={() => reviewTrack(track.id, 'rejected')} disabled={Boolean(reviewingTrackId)}>
                          <X size={15} /> Reject
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="catalog-empty">
                  <div className="empty-icon"><ShieldCheck size={22}/></div>
                  <p><strong>No tracks are waiting for review</strong></p>
                  <small>New artist submissions will appear here.</small>
                </div>
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
                <p className="muted">Plans and royalty information. Payments are not active.</p>
              </div>
            </section>
            <div className="notice-box prominent">
              <b>Payments are not live yet</b>
              <p>{paymentSetupMessage}</p>
            </div>
            <section className="plan-grid">
              <article className="panel plan-card">
                <span className="eyebrow">FOR LISTENERS</span>
                <h2>Premium Fan</h2>
                <div className="price">$2.99 <small>/ month</small></div>
                <ul>
                  <li>Ad-free listening concept</li>
                  <li>Support local artists</li>
                  <li>Exclusive releases</li>
                </ul>
              </article>
              <article className="panel plan-card">
                <span className="eyebrow">FOR ARTISTS</span>
                <h2>Pro Creator</h2>
                <div className="price">70% <small>proposed share</small></div>
                <ul>
                  <li>Artist uploads</li>
                  <li>Proposed royalty share</li>
                  <li>Listener analytics concept</li>
                </ul>
              </article>
            </section>
            <section className="panel payment-methods-panel" aria-labelledby="payment-methods-title">
              <div className="payment-methods-heading">
                <div>
                  <span className="eyebrow">SOUTH SUDAN CHECKOUT</span>
                  <h2 id="payment-methods-title">Planned payment methods</h2>
                  <p className="muted">Choose from local mobile money options or a payment card once checkout is configured.</p>
                </div>
                <span className="payment-methods-status">Setup pending</span>
              </div>
              <div className="payment-method-grid">
                {paymentMethods.map((method) => (
                  <article className="payment-method-card" key={method.name}>
                    <span className={`payment-method-icon ${method.type}`} aria-hidden="true">
                      {method.type === 'card' ? <CreditCard size={19}/> : <Smartphone size={19}/>}
                    </span>
                    <div className="payment-method-copy">
                      <strong>{method.name}</strong>
                      <small>{method.detail}</small>
                    </div>
                    <span className="payment-method-state">Coming soon</span>
                  </article>
                ))}
              </div>
              <p className="payment-method-note">No charges are processed. Provider credentials will be added later as server-side secrets after merchant setup and checkout verification.</p>
            </section>
            <section className="panel payout-panel">
              <div>
                <span className="eyebrow">ROYALTIES &amp; PAYOUTS</span>
                <h2>Artist earnings</h2>
                <p className="muted">No earnings are calculated or transferred yet.</p>
              </div>
              <Wallet size={28}/>
            </section>
          </>
        )}

        {tab === 'download' && <section className="app-download panel"><div className="download-icon"><Smartphone size={42}/></div><span className="eyebrow">LISTEN WHEREVER YOU ARE</span><h1>Get Junubify for Android &amp; iOS</h1><p>Use the installable web app to keep Junubify close. Native store downloads will be linked once the apps are published.</p><div className="store-buttons"><div className="store-placeholder"><Download size={22}/><span><small>ANDROID APP</small><b>Coming soon</b></span></div><div className="store-placeholder"><Download size={22}/><span><small>APPLE APP</small><b>Coming soon</b></span></div></div><div className="qr-placeholder" aria-label="Decorative QR-style pattern" role="img">{Array.from({ length: 64 }, (_, index) => <i key={index} className={(index * 7 + index % 3) % 4 === 0 ? 'qr-lit' : ''}/>)}</div><p className="muted">To install the current web app, use your browser menu and choose “Add to Home screen”.</p></section>}
      </main>
      <footer className="player"><div className="player-track">{playing ? <><img src={playing.cover || fallbackCover} alt=""/><div><b>{playing.title}</b><span>{playing.artist}</span></div></> : <><span className="player-note"><Music2 size={16}/></span><div><b>Nothing playing</b><span>Pick a track to listen</span></div></>}</div><audio ref={audioRef} src={audioUrl || undefined} onLoadedMetadata={(event) => setAudioDuration(event.currentTarget.duration)} onTimeUpdate={(event) => { const audio = event.currentTarget; if (isSamplePreview && audio.currentTime >= samplePreviewDuration && !sampleEndHandledRef.current) { sampleEndHandledRef.current = true; audio.pause(); audio.currentTime = samplePreviewDuration; advancePlayback(true); return; } setPlaybackTime(audio.currentTime); }} onEnded={() => advancePlayback()}/>{playing && <div className="player-progress" aria-label="Playback progress">{isSamplePreview && <span className="preview-label">SAMPLE</span>}<span>{formatPlaybackTime(playbackTime)}</span><progress max={playerDuration || 1} value={playerDuration ? Math.min(playbackTime, playerDuration) : 0}/><span>{formatPlaybackTime(playerDuration)}</span></div>}<button className="mini-play" onClick={() => playing && playTrack(playing)} aria-label="Toggle playback">{playing && audioRef.current && !audioRef.current.paused ? <Pause size={16}/> : <Play size={16}/>}</button></footer>
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
