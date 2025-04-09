// src/components/LandingPage/LandingPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Add this import
import './LandingPage.css';


// Auth Modal Component
// In your LandingPage.jsx file

// Auth Modal Component
const AuthModal = ({ isOpen, onClose, modalType, setModalType }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const navigate = useNavigate();
  const { signIn, signUp, getDisplayName } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      
      if (modalType === 'login') {
        result = await signIn(email, password);
      } else {
        // Pass username when signing up
        result = await signUp(email, password, username);
        
        // Debug: Check if user metadata was properly set
        if (result.data?.user) {
          console.log("User metadata after signup:", result.data.user.user_metadata);
          setDebugInfo(result.data.user.user_metadata);
          
          // Try to get display name
          const displayName = await getDisplayName();
          console.log("Display name from helper:", displayName);
        }
      }

      if (result.error) {
        throw result.error;
      }

      // Successfully authenticated
      onClose();
      
      // If signing up, we might need to verify email first
      if (modalType === 'register' && result.data?.user?.identities?.length === 0) {
        alert('Please check your email for verification!');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    
    <div className="auth-modal-wrapper">
      <div className="auth-modal-content">
        <button className="close-modal" onClick={onClose}>×</button>
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>{modalType === 'login' ? 'Log In' : 'Create Account'}</h2>

          {error && <div className="form-error">{error}</div>}
          
          {debugInfo && (
            <div className="debug-info" style={{ fontSize: '12px', background: '#f0f0f0', padding: '8px', marginBottom: '10px' }}>
              <p>User metadata: {JSON.stringify(debugInfo)}</p>
            </div>
          )}

          {/* Only show username field for registration */}
          {modalType === 'register' && (
            <div className="form-group">
              <label htmlFor="username">Username (Display Name)</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="primary-button"
            disabled={loading}
          >
            {loading ? 'Processing...' : (modalType === 'login' ? 'Log In' : 'Sign Up')}
          </button>

          <div className="auth-footer">
            {modalType === 'login' ? (
              <p>Don't have an account? <a href="#" onClick={(e) => {
                e.preventDefault(); 
                setModalType('register');
              }}>Sign up</a></p>
            ) : (
              <p>Already have an account? <a href="#" onClick={(e) => {
                e.preventDefault(); 
                setModalType('login');
              }}>Log in</a></p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('login'); // 'login' or 'register'
  const navigate = useNavigate();
  const { user } = useAuth(); // Make sure useAuth is imported

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const openModal = (type) => {
    setModalType(type);
    setModalOpen(true);
  };

  return (
    <div className="landing-page">
      
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>NexViz : Advanced CSV Visualization</h1>
          
          <p className="hero-subtitle">
            Transform your data into meaningful insights with our powerful CSV visualization tool.
            Upload, visualize, and analyze your data in seconds.
          </p>
          <div className="hero-buttons">
            <button className="primary-button" onClick={() => openModal('register')}>
              Get Started
            </button>
            <button className="secondary-button" onClick={() => openModal('login')}>
              Log In
            </button>
          </div>
        </div>
        <div className="hero-image">
          <div className="chart-illustration">
            <div className="bar bar-1"></div>
            <div className="bar bar-2"></div>
            <div className="bar bar-3"></div>
            <div className="bar bar-4"></div>
            <div className="bar bar-5"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>Powerful Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Interactive Charts</h3>
            <p>Create beautiful, interactive charts with just a few clicks. Choose from bar charts, line charts, pie charts, and more.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3>Advanced Filtering</h3>
            <p>Filter and sort your data to focus on what matters most. Apply multiple filters simultaneously for complex analysis.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>Responsive Design</h3>
            <p>Access your visualizations on any device with our fully responsive interface. Perfect for presentations and on-the-go analysis.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Secure Data</h3>
            <p>Your data never leaves your browser. Our tool processes everything locally, ensuring maximum privacy and security.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💾</div>
            <h3>Export & Share</h3>
            <p>Export your visualizations or share them with colleagues. Download as images or save your work for later.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🧩</div>
            <h3>Workspace</h3>
            <p>Create and save multiple charts in your workspace to build comprehensive dashboards from your data.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Upload CSV</h3>
            <p>Simply upload your CSV file through our intuitive interface.</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Select Data</h3>
            <p>Choose which columns to visualize and how you want to represent them.</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Customize</h3>
            <p>Apply filters, change chart types, and adjust settings to create the perfect visualization.</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>Analyze & Share</h3>
            <p>Gain insights from your data and share your findings with others.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2025 CSV Data Visualization. All rights reserved.</p>
        <div className="footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Contact Us</a>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        modalType={modalType}
        setModalType={setModalType}
      />
    </div>
  );
}

export default LandingPage;