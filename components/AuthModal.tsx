import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocalization } from '../context/LocalizationContext';
import { CloseIcon } from './icons';
import { signIn, signUp, googleSignIn, getFirebaseAuthErrorMessage } from '../services/firebaseService';

declare var google: any;

interface AuthModalProps {
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { t } = useLocalization();
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleSignInAvailable, setIsGoogleSignInAvailable] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const handleGoogleSignIn = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
        await googleSignIn();
        onClose();
    } catch (error: any) {
        const errorMessage = getFirebaseAuthErrorMessage(error.code, t);
        setError(errorMessage);
    } finally {
        setIsLoading(false);
    }
  }, [onClose, t]);
  
  const handleCredentialResponse = useCallback(() => {
    // This function is now just a wrapper for our main Google sign-in handler.
    handleGoogleSignIn();
  }, [handleGoogleSignIn]);

  useEffect(() => {
    if (typeof google === 'undefined' || !google.accounts) {
      setIsGoogleSignInAvailable(false);
      return;
    }

    const clientId = '251801743099-o83b4e5bsf2brra2sfoadjad61rpe5a0.apps.googleusercontent.com';
    
    try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
        });

        if (!isGoogleSignInAvailable) {
            setIsGoogleSignInAvailable(true);
        }
        
        if (isGoogleSignInAvailable && googleButtonRef.current && googleButtonRef.current.childElementCount === 0) {
          google.accounts.id.renderButton(
            googleButtonRef.current,
            { theme: "outline", size: "large", type: "standard", shape: "rectangular", text: "continue_with" }
          );
        }
    } catch (error) {
        console.error("Google GSI initialization error:", error);
        setIsGoogleSignInAvailable(false);
    }
  }, [isGoogleSignInAvailable, handleCredentialResponse]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let requiredFields: string[] = [];
    if (!isLoginView) requiredFields.push(username);
    requiredFields.push(email, password);

    if (requiredFields.some(field => !field)) {
      setError(t('auth.error_required'));
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      if (isLoginView) {
        await signIn(email, password);
      } else {
        if (password.length < 6) {
            setError(t('auth.error_short_password'));
            setIsLoading(false);
            return;
        }
        await signUp(email, password, username);
      }
      onClose();
    } catch (error: any) {
        const errorMessage = getFirebaseAuthErrorMessage(error.code, t);
        setError(errorMessage);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-slate-700">
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-slate-100">{t('auth.title')}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors">
            <CloseIcon className="w-6 h-6 text-slate-400" />
          </button>
        </div>
        
        <div className="p-6">
            <div className="flex border-b border-slate-600 mb-6">
                <button 
                    onClick={() => { setIsLoginView(true); setError(''); }}
                    className={`flex-1 py-2 text-center font-semibold transition-colors ${isLoginView ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    {t('auth.login_tab')}
                </button>
                <button 
                    onClick={() => { setIsLoginView(false); setError(''); }}
                    className={`flex-1 py-2 text-center font-semibold transition-colors ${!isLoginView ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    {t('auth.signup_tab')}
                </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
                {!isLoginView && (
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1" htmlFor="username">{t('auth.username_label')}</label>
                        <input 
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                    </div>
                )}
                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1" htmlFor="email">{t('auth.email_label')}</label>
                    <input 
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1" htmlFor="password">{t('auth.password_label')}</label>
                    <input 
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                </div>

                {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                <button type="submit" disabled={isLoading} className={`w-full py-3 rounded-lg font-bold text-lg transition-colors flex justify-center items-center ${isLoginView ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white'} disabled:bg-slate-600`}>
                    {isLoading ? '...' : (isLoginView ? t('auth.login_button') : t('auth.signup_button'))}
                </button>
            </form>
            
            <div className="text-center mt-4">
                <button onClick={() => { setIsLoginView(!isLoginView); setError(''); }} className="text-sm text-slate-400 hover:text-yellow-400 underline">
                    {isLoginView ? t('auth.switch_to_signup') : t('auth.switch_to_login')}
                </button>
            </div>
            
            <div className="flex items-center my-6">
              <div className="flex-grow border-t border-slate-600"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-sm">{t('auth.divider_or')}</span>
              <div className="flex-grow border-t border-slate-600"></div>
            </div>

            {isGoogleSignInAvailable ? (
                <div ref={googleButtonRef} className="flex justify-center" />
            ) : (
                <div className="text-center text-sm text-slate-400 bg-slate-700/50 p-3 rounded-lg">
                    {t('auth.google_signin_unavailable')}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;