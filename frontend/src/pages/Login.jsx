// src/pages/Login.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Login() {
  // ----- login -----
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // ----- register -----
  const [rName, setRName] = useState('');
  const [rEmail, setREmail] = useState('');
  const [rPassword, setRPassword] = useState('');
  const [rPhone, setRPhone] = useState(''); // remova se não usar no backend
  // ui
  const [loading, setLoading] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();

  // Se vier de /login?mode=register abre o verso já no cadastro
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get('mode') === 'register') setIsFlipped(true);
  }, [search]);

  // ====== LOGIN ======
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      const { token, user } = data || {};
      login(token, user);
      localStorage.setItem('userData', JSON.stringify(user));
      toast.success('Login bem-sucedido!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Email ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  // ====== REGISTER ======
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: rName,
        email: rEmail,
        password: rPassword,
        ...(rPhone ? { phone: rPhone } : {}),
      };

      const { data } = await api.post('/auth/register', payload);

      // Se a API já devolver token/user, fazemos o login automático
      if (data?.token && data?.user) {
        login(data.token, data.user);
        localStorage.setItem('userData', JSON.stringify(data.user));
        toast.success('Conta criada! Bem-vindo(a) 👋');
        navigate('/dashboard');
      } else {
        toast.success('Conta criada! Faça login para continuar.');
        setIsFlipped(false); // volta para o login
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Não foi possível criar sua conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Fonte Inter */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap"
        rel="stylesheet"
      />

      {/* Estilos (neumórfico + flip 3D) */}
      <style>{`
        .auth-root {
          display: grid;
          place-items: center;
          min-height: 100vh;
          margin: 0;
          padding: 20px;
          background: #e0e5ec;
          font-family: 'Inter', sans-serif;
          color: #5b6779;
          box-sizing: border-box;
        }
        .flip-card {
          background: transparent;
          width: 100%;
          max-width: 420px;
          height: 650px;
          perspective: 1000px;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.8s;
          transform-style: preserve-3d;
        }
        .flip-card-inner.is-flipped { transform: rotateY(180deg); }
        .flip-side {
          position: absolute;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          display: grid;
          place-items: center;
        }
        .flip-side.back { transform: rotateY(180deg); }

        .neumorphic-card {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px;
          width: 100%;
          height: 100%;
          gap: 20px;
          text-align: center;
          background: #e0e5ec;
          border-radius: 20px;
          box-shadow: 9px 9px 16px #a3b1c6, -9px -9px 16px #ffffff;
          box-sizing: border-box;
        }
        .logo-img {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          margin-bottom: 15px;
          filter: drop-shadow(5px 5px 8px #a3b1c6) drop-shadow(-5px -5px 8px #ffffff);
          transition: filter 0.3s ease;
        }
        .logo-img:hover {
          filter: drop-shadow(3px 3px 5px #a3b1c6) drop-shadow(-3px -3px 5px #ffffff);
        }
        .neumorphic-card h3 {
          font-size: 2rem;
          font-weight: 700;
          margin: 0 0 10px 0;
          color: #3e4a5b;
        }
        .neumorphic-input {
          border: none;
          outline: none;
          padding: 18px 20px;
          width: 100%;
          font-size: 1rem;
          background: #e0e5ec;
          border-radius: 15px;
          box-sizing: border-box;
          box-shadow: inset 7px 7px 15px #a3b1c6, inset -7px -7px 15px #ffffff;
          transition: box-shadow 0.3s ease;
        }
        .neumorphic-input::placeholder { color: #8c9aae; }
        .neumorphic-input:focus {
          box-shadow: inset 5px 5px 10px #a3b1c6, inset -5px -5px 10px #ffffff;
        }
        .neumorphic-button {
          border: none;
          outline: none;
          padding: 18px;
          width: 100%;
          font-size: 1rem;
          font-weight: 700;
          color: #4a77e5;
          background: #e0e5ec;
          border-radius: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 6px 6px 12px #a3b1c6, -6px -6px 12px #ffffff;
        }
        .neumorphic-button:hover {
          box-shadow: 4px 4px 10px #a3b1c6, -4px -4px 10px #ffffff;
        }
        .neumorphic-button:active {
          color: #3e63b9;
          box-shadow: inset 7px 7px 15px #a3b1c6, inset -7px -7px 15px #ffffff;
        }
        .flip-text { margin-top: 6px; font-size: 0.9rem; color: #5b6779; }
        .flip-link { font-weight: 700; color: #4a77e5; cursor: pointer; }
        .w100 { width: 100%; }
      `}</style>

      <div className="auth-root">
        <div className="flip-card">
          <div className={`flip-card-inner ${isFlipped ? 'is-flipped' : ''}`}>
            {/* FRENTE: LOGIN */}
            <div className="flip-side front">
              <div className="neumorphic-card">
                <img
                  src="https://i.imgur.com/zk28dJd.png"
                  alt="Logo"
                  className="logo-img"
                />
                <h3>Login</h3>

                <form onSubmit={handleSubmit} className="w100" autoComplete="on">
                  <input
                    type="email"
                    className="neumorphic-input"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                  <input
                    type="password"
                    className="neumorphic-input"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ marginTop: 14 }}
                  />
                  <button
                    type="submit"
                    className="neumorphic-button"
                    disabled={loading}
                    style={{ marginTop: 14 }}
                  >
                    {loading ? 'Entrando…' : 'Entrar'}
                  </button>
                </form>

                <p className="flip-text">
                  Não tem uma conta?{' '}
                  <span className="flip-link" onClick={() => setIsFlipped(true)}>
                    Cadastre-se
                  </span>
                </p>
              </div>
            </div>

            {/* VERSO: CADASTRO */}
            <div className="flip-side back">
              <div className="neumorphic-card">
                <img
                  src="https://i.imgur.com/zk28dJd.png"
                  alt="Logo"
                  className="logo-img"
                />
                <h3>Cadastro</h3>

                <form onSubmit={handleRegister} className="w100" autoComplete="on">
                  <input
                    type="text"
                    className="neumorphic-input"
                    placeholder="Nome completo"
                    value={rName}
                    onChange={(e) => setRName(e.target.value)}
                    required
                  />
                  <input
                    type="email"
                    className="neumorphic-input"
                    placeholder="E-mail"
                    value={rEmail}
                    onChange={(e) => setREmail(e.target.value)}
                    required
                    style={{ marginTop: 14 }}
                  />
                  <input
                    type="tel"
                    className="neumorphic-input"
                    placeholder="WhatsApp (opcional)"
                    value={rPhone}
                    onChange={(e) => setRPhone(e.target.value)}
                    style={{ marginTop: 14 }}
                  />
                  <input
                    type="password"
                    className="neumorphic-input"
                    placeholder="Senha"
                    value={rPassword}
                    onChange={(e) => setRPassword(e.target.value)}
                    required
                    style={{ marginTop: 14 }}
                  />
                  <button
                    type="submit"
                    className="neumorphic-button"
                    disabled={loading}
                    style={{ marginTop: 14 }}
                  >
                    {loading ? 'Criando…' : 'Cadastrar'}
                  </button>
                </form>

                <p className="flip-text">
                  Já tem uma conta?{' '}
                  <span className="flip-link" onClick={() => setIsFlipped(false)}>
                    Fazer login
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
