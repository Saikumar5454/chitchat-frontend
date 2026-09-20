import React, { useCallback, useEffect, useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL;

const formatValue = (value) => {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value);
};

export const AdminPanel = ({ token, onBack, onLogout }) => {
    const [tables, setTables] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const loadDatabase = useCallback(() => {
        setLoading(true);
        fetch(`${API_URL}/api/admin/database`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (response) => {
                const data = await response.json();
                if (response.status === 401) {
                    onLogout();
                    return null;
                }
                if (!response.ok) throw new Error(data.detail || 'Could not load database');
                return data;
            })
            .then((data) => {
                if (data) {
                    setTables(data.tables);
                    setError('');
                }
            })
            .catch((requestError) => setError(requestError.message))
            .finally(() => setLoading(false));
    }, [token, onLogout]);

    useEffect(() => {
        loadDatabase();
    }, [loadDatabase]);

    return (
        <section className="admin-card" aria-label="Database administration">
            <header className="admin-header">
                <div>
                    <p className="eyebrow">ADMIN CONSOLE</p>
                    <h1>Database tables</h1>
                    <p className="admin-subtitle">Live PostgreSQL data overview</p>
                </div>
                <div className="admin-actions">
                    <button type="button" className="admin-button secondary" onClick={onBack}>Back to chat</button>
                    <button type="button" className="admin-button" onClick={loadDatabase}>Refresh</button>
                </div>
            </header>
            {loading && <p className="admin-status">Loading database...</p>}
            {error && <p className="connection-error" role="alert">{error}</p>}
            {!loading && !error && tables.map((table) => (
                <article className="table-card" key={table.name}>
                    <div className="table-heading">
                        <div>
                            <p className="table-kicker">TABLE</p>
                            <h2>{table.name}</h2>
                        </div>
                        <span className="row-count">{table.rows.length} rows</span>
                    </div>
                    <div className="schema-list">
                        {table.columns.map((column) => (
                            <div className="schema-item" key={column.column_name}>
                                <strong>{column.column_name}</strong>
                                <span>{column.data_type}</span>
                                <small>{column.is_nullable === 'YES' ? 'nullable' : 'required'}</small>
                            </div>
                        ))}
                    </div>
                    <div className="table-scroll">
                        <table>
                            <thead><tr>{table.rows[0] ? Object.keys(table.rows[0]).map((key) => <th key={key}>{key}</th>) : <th>No records</th>}</tr></thead>
                            <tbody>
                                {table.rows.map((row, index) => (
                                    <tr key={row.id || index}>{Object.entries(row).map(([key, value]) => <td key={key}>{formatValue(value)}</td>)}</tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </article>
            ))}
        </section>
    );
};
