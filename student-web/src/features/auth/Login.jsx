import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
} from "lucide-react";
import "./Login.css";

export default function Login({ onLoginSuccess }) {
  return (
    <div className="login-screen">
      <Header />

      <main className="login-main">
        <motion.div
          className="login-shell"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="login-heading">
            <h1>Administrator Login</h1>
          </div>

          <LoginCard onLoginSuccess={onLoginSuccess} />

          <motion.div
            className="login-trust"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.45 }}
          >
            <div className="login-trust-item">
              <Lock size={14} strokeWidth={2.2} />
              <span>Secure Connection</span>
            </div>
            <div className="login-trust-item">
              <ShieldCheck size={14} strokeWidth={2.2} />
              <span>2FA Enabled</span>
            </div>
          </motion.div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="login-header">
      <div className="login-brand">
        <div className="login-brand-mark" aria-hidden="true" />
        <span>Kugan &amp; Associates</span>
      </div>

      <div className="login-header-actions">
        <nav className="login-nav">
          <a href="#">Portal Home</a>
          <a href="#">Support</a>
        </nav>
        <button type="button" className="login-contact-btn">
          Contact Us
        </button>
      </div>
    </header>
  );
}

function LoginCard({ onLoginSuccess }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess?.();
    }, 700);
  };

  return (
    <div className="login-card">
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-field">
          <label htmlFor="email">Administrator Email</label>
          <input
            id="email"
            type="email"
            placeholder="email@kugan.com"
            required
          />
        </div>

        <div className="login-field">
          <label htmlFor="password">Password</label>
          <div className="login-password-wrap">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              className="login-password-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="login-options">
          <label className="login-remember">
            <input type="checkbox" />
            <span>Remember Me</span>
          </label>
          <a href="#" className="login-forgot-link">
            Forgot Password?
          </a>
        </div>

        <button type="submit" className="login-submit-btn" disabled={isLoading}>
          {isLoading ? (
            <span className="login-spinner" aria-hidden="true" />
          ) : (
            <>
              <span>Log In</span>
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </form>

      <div className="login-note">
        Authorized personnel only. Access is monitored and logged.
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="login-footer">
      <p>&copy; 2024 Kugan &amp; Associates. All rights reserved.</p>
      <div className="login-footer-links">
        <a href="#">Privacy Policy</a>
        <a href="#">Terms of Service</a>
      </div>
    </footer>
  );
}
