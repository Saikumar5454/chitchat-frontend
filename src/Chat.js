import React, { useEffect, useRef, useState } from 'react';
import { Message } from './Message';
import { io } from 'socket.io-client';

const socket = io(process.env.REACT_APP_API_URL, {
    path: process.env.REACT_APP_SOCKET_PATH,
    autoConnect: false,
});

export const Chat = ({ token, onLogout }) => {
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [connectionError, setConnectionError] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState('chat');
    const [profileContact, setProfileContact] = useState(null);
    const [onlineUserIds, setOnlineUserIds] = useState(new Set());
    const messagesEndRef = useRef(null);
    const seenRequestedRef = useRef(new Set());

    useEffect(() => {
        const requestOptions = { headers: { Authorization: `Bearer ${token}` } };
        Promise.all([
            fetch(`${process.env.REACT_APP_API_URL}/api/auth/me`, requestOptions),
            fetch(`${process.env.REACT_APP_API_URL}/api/users`, requestOptions),
        ])
            .then(async ([userResponse, contactsResponse]) => {
                if (userResponse.status === 401 || contactsResponse.status === 401) {
                    onLogout();
                    return null;
                }
                if (!userResponse.ok || !contactsResponse.ok) throw new Error('Could not load contacts');
                return Promise.all([userResponse.json(), contactsResponse.json()]);
            })
            .then((result) => {
                if (!result) return;
                const [userData, users] = result;
                setCurrentUser({ ...userData.user, id: userData.user.id ?? userData.user.sub });
                setContacts(users);
                setSelectedContact((current) => current || users[0] || null);
            })
            .catch(() => setConnectionError('Could not load registered users.'));
    }, [token, onLogout]);

    useEffect(() => {
        const handleConnect = () => {
            setIsConnected(true);
            setConnectionError('');
        };
        const handleDisconnect = () => {
            setIsConnected(false);
        };
        const handleConnectError = (error) => {
            setIsConnected(false);
            if (error?.message === 'Authentication error') {
                onLogout();
                return;
            }
            setConnectionError(error?.message || 'Unable to connect to chat.');
        };
        const handleJoin = (data) => {
            setMessages((prevMessages) => [...prevMessages, {...data, type: 'join'}]);
        };
        const handleChat = (data) => {
            setMessages((prevMessages) => [...prevMessages, {...data, type: 'chat'}]);
        };
        const handleHistory = (data) => {
            setMessages(data);
        };
        const handlePresence = (data) => {
            setOnlineUserIds((current) => {
                const next = new Set(current);
                if (data.online) next.add(Number(data.user_id));
                else next.delete(Number(data.user_id));
                return next;
            });
            setContacts((current) => current.map((contact) => (
                Number(contact.id) === Number(data.user_id)
                    ? { ...contact, last_seen_at: data.last_seen_at }
                    : contact
            )));
        };
        const handleMessageStatus = (data) => {
            setMessages((current) => current.map((item) => (
                Number(item.id) === Number(data.id)
                    ? {
                        ...item,
                        seen_at: data.seen_at || item.seen_at,
                        delivered_at: data.delivered_at || item.delivered_at || data.seen_at,
                    }
                    : item
            )));
        };

        socket.auth = { token };
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);
        socket.on('join', handleJoin);
        socket.on('chat', handleChat);
        socket.on('history', handleHistory);
        socket.on('presence', handlePresence);
        socket.on('message_status', handleMessageStatus);
        socket.connect();

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('connect_error', handleConnectError);
            socket.off('join', handleJoin);
            socket.off('chat', handleChat);
            socket.off('history', handleHistory);
            socket.off('presence', handlePresence);
            socket.off('message_status', handleMessageStatus);
            socket.disconnect();
        };
    }, [token, onLogout, currentUser?.id]);

    const formatLastSeen = (lastSeenAt) => lastSeenAt
        ? `Last seen ${new Date(lastSeenAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`
        : 'Offline';
    const isOnline = (person) => onlineUserIds.has(Number(person?.id));

    useEffect(() => {
        if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, selectedContact]);

    useEffect(() => {
        if (!currentUser) return;
        fetch(`${process.env.REACT_APP_API_URL}/api/messages`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((response) => {
                if (!response.ok) throw new Error('Could not load message history');
                return response.json();
            })
            .then((history) => setMessages(history))
            .catch(() => setConnectionError('Could not load message history.'));
    }, [currentUser, token]);

    const conversationMessages = messages.filter((currentMessage) => {
        if (!selectedContact || !currentUser || currentMessage.type !== 'chat') return false;
        const senderId = Number(currentMessage.sender_id);
        const recipientId = Number(currentMessage.recipient_id);
        const currentUserId = Number(currentUser.id);
        const selectedContactId = Number(selectedContact.id);
        return (
            (senderId === currentUserId && recipientId === selectedContactId) ||
            (senderId === selectedContactId && recipientId === currentUserId)
        );
    });

    useEffect(() => {
        if (!currentUser || !selectedContact || activeTab !== 'chat' || !isConnected) return;
        conversationMessages.forEach((currentMessage) => {
            const isIncoming = Number(currentMessage.sender_id) === Number(selectedContact.id)
                && Number(currentMessage.recipient_id) === Number(currentUser.id);
            if (isIncoming && !currentMessage.seen_at && !seenRequestedRef.current.has(currentMessage.id)) {
                seenRequestedRef.current.add(currentMessage.id);
                socket.emit('message_seen', currentMessage.id);
            }
        });
    }, [activeTab, currentUser, isConnected, messages, selectedContact, conversationMessages]);

    const sendMessage = (event) => {
        event.preventDefault();
        const trimmedMessage = message.trim();
        if (!trimmedMessage || !isConnected) return;

        if (!selectedContact) return;
        socket.emit('chat', {
            recipient_id: selectedContact.id,
            message: trimmedMessage,
        });
        setMessage('');
    };

    return (
        <section className="chat-card" aria-label="Chat application">
            <header className="chat-header">
                <div>
                    <p className="eyebrow">REAL-TIME ROOM</p>
                    <h1>{selectedContact ? selectedContact.display_name : 'Open conversation'}</h1>
                    {selectedContact && <>
                        <p className="conversation-email">{selectedContact.email}</p>
                        <p className="presence-text">{isOnline(selectedContact) ? 'Online' : formatLastSeen(selectedContact.last_seen_at)}</p>
                    </>}
                </div>
                <div className="header-actions">
                    <span className={`connection-pill ${isConnected ? 'online' : 'offline'}`}>
                        <span className="status-dot" />
                        {isConnected ? 'Connected' : 'Offline'}
                    </span>
                    <button className="logout-button" type="button" onClick={onLogout}>Log out</button>
                    <button className="profile-menu-button" type="button" aria-label="Open my profile" onClick={() => setProfileContact(currentUser)}>⋮</button>
                </div>
            </header>

            <nav className="app-tabs" aria-label="Main navigation" role="tablist">
                <button className={`app-tab ${activeTab === 'chat' ? 'active' : ''}`} type="button" role="tab" aria-selected={activeTab === 'chat'} onClick={() => setActiveTab('chat')}>Chat</button>
                <button className={`app-tab ${activeTab === 'contacts' ? 'active' : ''}`} type="button" role="tab" aria-selected={activeTab === 'contacts'} onClick={() => setActiveTab('contacts')}>Contacts <span>{contacts.length}</span></button>
            </nav>
            {activeTab === 'contacts' && <nav className="contact-list" aria-label="Contacts" role="tablist">
                {contacts.length === 0 ? <p className="no-contacts">No other registered users yet.</p> : contacts.map((contact) => (
                    <div className="contact-entry" key={contact.id}>
                        <button className={`contact-button ${selectedContact?.id === contact.id ? 'selected' : ''}`} type="button" role="tab" aria-selected={selectedContact?.id === contact.id} onClick={() => { setSelectedContact(contact); setActiveTab('chat'); }}>
                            <span className="contact-avatar">{contact.display_name.slice(0, 1).toUpperCase()}</span><span><strong>{contact.display_name}</strong><small className="contact-presence">{isOnline(contact) ? 'Online' : formatLastSeen(contact.last_seen_at)}</small></span>
                        </button>
                        <button className="more-button" type="button" aria-label={`View ${contact.display_name} profile`} onClick={() => setProfileContact(contact)}>⋮</button>
                    </div>
                ))}
            </nav>}
            {profileContact && <div className="profile-backdrop" role="presentation" onClick={() => setProfileContact(null)}>
                <article className="profile-panel" role="dialog" aria-modal="true" aria-labelledby="profile-title" onClick={(event) => event.stopPropagation()}>
                    <button className="profile-close" type="button" aria-label="Close profile" onClick={() => setProfileContact(null)}>×</button>
                    <div className="profile-avatar">{profileContact.display_name.slice(0, 1).toUpperCase()}</div>
                    <p className="eyebrow">PROFILE</p>
                    <h2 id="profile-title">{profileContact.display_name}</h2>
                    <p className="profile-email">{profileContact.email}</p>
                    <p className="profile-presence">{isOnline(profileContact) ? 'Online now' : formatLastSeen(profileContact.last_seen_at)}</p>
                    <p className="profile-about">{profileContact.about || 'Available on Chat'}</p>
                </article>
            </div>}
            {connectionError && <p className="connection-error" role="alert">{connectionError}</p>}

            <div className={`message-list ${activeTab === 'contacts' ? 'contacts-preview' : ''}`} aria-live="polite">
                {conversationMessages.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">✦</span>
                        <h2>{selectedContact ? `No messages with ${selectedContact.display_name}` : 'Choose a contact'}</h2>
                        <p>{selectedContact ? 'Send a private message to start this conversation.' : 'Choose someone from Contacts to begin.'}</p>
                    </div>
                ) : (
                    conversationMessages.map((currentMessage, index) => (
                        <Message
                            key={currentMessage.id || `${currentMessage.sid}-${index}`}
                            message={currentMessage}
                            isOwn={Number(currentMessage.sender_id) === Number(currentUser?.id)}
                            profile={Number(currentMessage.sender_id) === Number(currentUser?.id) ? currentUser : selectedContact}
                            onProfile={setProfileContact}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="message-form" onSubmit={sendMessage}>
                <label className="sr-only" htmlFor="message">Write a message</label>
                <input
                    type="text"
                    id="message"
                    value={message}
                    placeholder={!isConnected ? 'Reconnecting...' : selectedContact ? `Message ${selectedContact.display_name}...` : 'Select a person first'}
                    onChange={(event) => setMessage(event.target.value)}
                    disabled={!isConnected || !selectedContact}
                    autoComplete="off"
                />
                <button type="submit" disabled={!isConnected || !selectedContact || !message.trim()} aria-label="Send message">
                    <span aria-hidden="true">↑</span>
                </button>
            </form>
            <p className="composer-hint">Press Enter to send</p>
        </section>
    );
};