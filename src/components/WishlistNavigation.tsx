import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Bell, Heart, Mic, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Listing = { id: string; title?: string; price?: number; city?: string; locality?: string; photos?: string[] };
type Props = { document: Document };

export function WishlistNavigation({ document: doc }: Props) {
  const [view, setView] = useState<'home' | 'wishlist' | 'notifications'>('home');
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [language, setLanguage] = useState(doc.documentElement.lang);
  const hi = language === 'hi';
  const emit = (name: string, detail?: unknown) => doc.dispatchEvent(new CustomEvent(name, { detail }));
  const home = () => { setView('home'); emit('basera-return-home'); };

  useEffect(() => {
    const onLanguage = () => setLanguage(doc.documentElement.lang);
    const onOpen = () => setView('wishlist');
    const onClose = () => setView('home');
    const onFavorite = (event: Event) => {
      const listing = (event as CustomEvent<Listing>).detail;
      if (!listing?.id) return;
      setFavorites(previous => previous.some(item => item.id === listing.id)
        ? previous.filter(item => item.id !== listing.id) : [...previous, listing]);
    };
    doc.addEventListener('basera-language', onLanguage);
    doc.addEventListener('basera-wishlist', onOpen);
    doc.addEventListener('basera-close-screens', onClose);
    doc.addEventListener('basera-favorite', onFavorite);
    return () => {
      doc.removeEventListener('basera-language', onLanguage);
      doc.removeEventListener('basera-wishlist', onOpen);
      doc.removeEventListener('basera-close-screens', onClose);
      doc.removeEventListener('basera-favorite', onFavorite);
    };
  }, [doc]);

  useEffect(() => {
    doc.dispatchEvent(new CustomEvent('basera-favorites-sync', { detail: favorites.map(item => item.id) }));
  }, [doc, favorites]);

  const tools = doc.getElementById('reactHeaderTools');
  const microphone = doc.getElementById('reactSearchMic');
  if (!tools || !microphone) return null;
  const wishlistLabel = hi ? 'इच्छा सूची' : 'Wishlist';
  return <>
    {createPortal(<Button variant="ghost" size="icon" className="header-tool search-mic" aria-label={hi ? 'बोलकर खोजें' : 'Voice search'} title={hi ? 'बोलकर खोजें' : 'Voice search'} onClick={() => emit('basera-voice')}><Mic size={21} /></Button>, microphone)}
    {createPortal(<>
      <Button variant="ghost" size="icon" className="header-tool" aria-label={wishlistLabel} title={wishlistLabel} onClick={() => { emit('basera-return-home'); setView('wishlist'); }}><Heart size={24} />{favorites.length > 0 && <span className="favorite-count">{favorites.length}</span>}</Button>
      <Button variant="ghost" size="icon" className="header-tool" aria-label={hi ? 'सूचनाएं' : 'Notifications'} title={hi ? 'सूचनाएं' : 'Notifications'} onClick={() => setView(view === 'notifications' ? 'home' : 'notifications')}><Bell size={24} /></Button>
    </>, tools)}
    {view === 'notifications' && createPortal(<section className="header-notifications" aria-label={hi ? 'सूचनाएं' : 'Notifications'}>
      <div><h2>{hi ? 'सूचनाएं' : 'Notifications'}</h2><Button variant="ghost" size="icon" className="wishlist-back" aria-label={hi ? 'बंद करें' : 'Close'} onClick={() => setView('home')}><X /></Button></div>
      <p>{hi ? 'अभी कोई सूचना नहीं है' : 'No notifications yet'}</p>
    </section>, doc.body)}
    {view === 'wishlist' && createPortal(<section className="wishlist-screen" aria-label={wishlistLabel}>
      <header className="wishlist-header"><Button variant="ghost" size="icon" className="wishlist-back" aria-label={hi ? 'वापस' : 'Back'} onClick={home}><ArrowLeft size={24} /></Button><h1>{wishlistLabel}</h1></header>
      {favorites.length === 0 ? <div className="wishlist-empty">
        <svg className="wishlist-art" viewBox="0 0 220 170" role="img" aria-label={hi ? 'दो दिल' : 'Two overlapping hearts'}><path className="wishlist-heart-large" d="M104 145 34 80C-9 37 42-9 78 24L104 48 127 25C165-9 211 39 174 80Z" /><path className="wishlist-heart-small" d="m155 151-40-39c-24-25 5-51 25-33l15 14 14-14c21-18 48 9 27 33Z" /></svg>
        <h2>{hi ? 'आपने अभी तक कुछ भी पसंद नहीं किया है' : 'You haven’t liked anything yet'}</h2>
        <p>{hi ? 'ऐसी सभी चीज़ें एक ही जगह पर इकट्ठी करें जो आपको पसंद हैं' : 'Collect all the things you like in one place'}</p>
        <Button className="wishlist-action" onClick={home}>{hi ? 'ढूंढें' : 'Explore'}</Button>
      </div> : <div className="wishlist-list">{favorites.map(item => <article className="wishlist-item" key={item.id}>
        <Button variant="ghost" className="wishlist-listing" onClick={() => { home(); emit('basera-open-listing', item.id); }}>
          {item.photos?.[0] && <img src={item.photos[0]} alt={item.title || ''} />}
          <span><strong>{item.title}</strong><b>₹{Number(item.price || 0).toLocaleString('en-IN')}</b><small>{[item.locality, item.city].filter(Boolean).join(', ')}</small></span>
        </Button>
        <Button variant="ghost" size="icon" className="wishlist-remove" aria-label={hi ? 'पसंद से हटाएं' : 'Remove favorite'} onClick={() => setFavorites(previous => previous.filter(value => value.id !== item.id))}><Heart fill="currentColor" /></Button>
      </article>)}</div>}
    </section>, doc.body)}
  </>;
}