export const Message = ({ message, isOwn, profile, onProfile }) => {
    if (message.type === 'join') {
        return <div className="system-message">{message.sid} joined the room</div>;
    }

    if (message.type === 'chat') {
        return (
            <article className={`chat-message ${isOwn ? 'own-message' : 'incoming-message'}`}>
                {!isOwn && <button className="message-profile-button" type="button" aria-label={`View ${message.sid} profile`} onClick={() => onProfile(profile)}>
                    <span className="avatar">{message.sid.slice(0, 1).toUpperCase()}</span>
                </button>}
                <div className="message-bubble">
                    {isOwn && <button className="message-author message-author-button own-author" type="button" onClick={() => onProfile(profile)}>You</button>}
                    {!isOwn && <button className="message-author message-author-button" type="button" onClick={() => onProfile(profile)}>{message.sid}</button>}
                    <p className="message-text">{message.message}</p>
                    <time className="message-time">
                        {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        {isOwn && <span className={`message-ticks ${message.seen_at ? 'seen' : ''}`} aria-label={message.seen_at ? 'Seen' : message.delivered_at ? 'Delivered' : 'Sent'}>
                            {message.seen_at || message.delivered_at ? '✓✓' : '✓'}
                        </span>}
                    </time>
                </div>
            </article>
        );
    }

    return null;
};