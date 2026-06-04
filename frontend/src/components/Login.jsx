import React, { useState } from 'react';
import { api } from '../api';
import { Shield, Mail, Lock, Loader } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.login(email, password);
      const user = await api.getMe();
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'E-mail ou senha incorretos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.backgroundBlob1}></div>
      <div style={styles.backgroundBlob2}></div>
      
      <div className="glass-panel animate-fade-in" style={styles.card}>
        <div style={styles.logoContainer}>
          <div style={styles.logoIconBg}>
            <Shield size={32} color="#2563eb" />
          </div>
          <h1 style={styles.logoText}>Claudio</h1>
          <p style={styles.subtitle}>Gestão de Compliance & Condicionantes</p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <p style={styles.errorText}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="glass-input-group">
            <label className="glass-label" htmlFor="email">E-mail Corporativo</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                id="email"
                type="email"
                placeholder="nome@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="glass-input"
                style={styles.inputWithIcon}
              />
            </div>
          </div>

          <div className="glass-input-group">
            <label className="glass-label" htmlFor="password">Senha de Acesso</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="glass-input"
                style={styles.inputWithIcon}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="glass-btn glass-btn-primary"
            style={styles.submitBtn}
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" style={styles.spinIcon} />
                Verificando...
              </>
            ) : (
              'Entrar no Sistema'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// Estilos embutidos com suporte a CSS variables e glassmorphism
const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100vw',
    height: '100vh',
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundBlob1: {
    position: 'absolute',
    width: '450px',
    height: '450px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, rgba(37,99,235,0) 70%)',
    top: '-10%',
    left: '-10%',
    zIndex: 0,
  },
  backgroundBlob2: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0) 70%)',
    bottom: '-10%',
    right: '-10%',
    zIndex: 0,
  },
  card: {
    padding: '3rem 2.5rem',
    width: '100%',
    maxWidth: '440px',
    textAlign: 'center',
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: '2.25rem',
  },
  logoIconBg: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    background: 'rgba(37, 99, 235, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
  },
  logoText: {
    fontSize: '2rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    marginBottom: '0.25rem',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
  },
  inputIcon: {
    position: 'absolute',
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-light)',
  },
  inputWithIcon: {
    paddingLeft: '2.75rem',
  },
  submitBtn: {
    marginTop: '1rem',
    padding: '0.85rem',
    width: '100%',
  },
  errorAlert: {
    background: 'var(--danger-light)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    marginBottom: '1.5rem',
    textAlign: 'left',
  },
  errorText: {
    color: 'var(--danger)',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  spinIcon: {
    animation: 'spin 1s linear infinite',
  },
};
