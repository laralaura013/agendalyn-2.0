// src/pages/Home.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <>
      {/* Fonte Inter */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap"
        rel="stylesheet"
      />

      {/* Estilos isolados do card neumórfico */}
      <style>{`
        .home-root {
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
        .welcome-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 50px;
          width: 100%;
          max-width: 600px;
          background: #e0e5ec;
          border-radius: 30px;
          box-shadow: 12px 12px 24px #a3b1c6, -12px -12px 24px #ffffff;
          gap: 15px;
        }
        .logo-icon {
          width: 80px;
          height: 80px;
          padding: 20px;
          box-sizing: border-box;
          background: #e0e5ec;
          border-radius: 50%;
          box-shadow: 7px 7px 14px #a3b1c6, -7px -7px 14px #ffffff;
          margin-bottom: 10px;
        }
        .logo-icon svg {
          width: 100%;
          height: 100%;
          stroke: #7C3AED;
          stroke-width: 2;
        }
        .brand-name {
          font-size: 2rem;
          font-weight: 800;
          color: #3e4a5b;
          margin: 0;
        }
        .brand-subtitle {
          font-size: 1rem;
          margin: -10px 0 15px 0;
          color: #8c9aae;
        }
        .headline {
          font-size: 2.5rem;
          font-weight: 800;
          line-height: 1.2;
          color: #3e4a5b;
          margin: 10px 0;
        }
        .headline .highlight { color: #7C3AED; }
        .description {
          max-width: 480px;
          font-size: 1rem;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .button-group {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .neumorphic-button {
          border: none;
          outline: none;
          padding: 18px 30px;
          font-size: 1rem;
          font-weight: 700;
          border-radius: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          display: inline-block;
        }
        .btn-primary {
          background: linear-gradient(145deg, #8643ff, #7038d8);
          color: #ffffff;
          box-shadow: 6px 6px 12px #a3b1c6, -6px -6px 12px #ffffff;
        }
        .btn-primary:hover {
          background: linear-gradient(145deg, #7f3cfa, #6932cc);
          box-shadow: 4px 4px 10px #a3b1c6, -4px -4px 10px #ffffff;
        }
        .btn-primary:active {
          box-shadow: inset 4px 4px 8px #612cb3, inset -4px -4px 8px #994dff;
        }
        .btn-secondary {
          background: #e0e5ec;
          color: #5b6779;
          box-shadow: inset 6px 6px 12px #a3b1c6, inset -6px -6px 12px #ffffff;
        }
        .btn-secondary:hover {
          box-shadow: inset 4px 4px 10px #a3b1c6, inset -4px -4px 10px #ffffff;
        }
        .btn-secondary:active {
          box-shadow: inset 8px 8px 16px #a3b1c6, inset -8px -8px 16px #ffffff;
        }
      `}</style>

      <div className="home-root">
        <div className="welcome-card">
          <div className="logo-icon">
            {/* Ícone/Logo */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 16l2 2 4-4" />
            </svg>
          </div>

          <h1 className="brand-name">Agendalyn</h1>
          <p className="brand-subtitle">sistema de agendamento</p>

          <h2 className="headline">
            Organize seu negócio. <br />
            <span className="highlight">Encante seus clientes.</span>
          </h2>

          <p className="description">
            A plataforma completa para barbearias, salões de beleza e clínicas de estética.
            Agendamentos, controle financeiro, e muito mais, tudo em um só lugar.
          </p>

          <div className="button-group">
            {/* abre a tela de login já no modo "cadastro" (via query) */}
            <Link to="/login?mode=register" className="neumorphic-button btn-primary">
              Cadastre-se Grátis
            </Link>

            <Link to="/login" className="neumorphic-button btn-secondary">
              Acessar Plataforma
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
