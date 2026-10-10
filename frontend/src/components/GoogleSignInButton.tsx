import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { api } from '../api/client';

const googleWebClientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID?.trim();
let nativeInitialize: Promise<typeof import('@capgo/capacitor-social-login').SocialLogin> | undefined;
let googleScriptLoad: Promise<void> | undefined;

type GoogleCredentialResponse = { credential?: string };
type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        nonce: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }) => void;
      renderButton: (element: HTMLElement, options: {
        type: 'standard';
        theme: 'outline';
        size: 'large';
        text: 'continue_with';
        shape: 'rectangular';
        width: number;
        logo_alignment: 'left';
      }) => void;
    };
  };
};

type GoogleWindow = Window & { google?: GoogleIdentity };

function loadGoogleIdentityScript() {
  const googleWindow = window as GoogleWindow;
  if (googleWindow.google?.accounts?.id) return Promise.resolve();
  if (googleScriptLoad) return googleScriptLoad;

  googleScriptLoad = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.zynqoraGoogleIdentity = 'true';
    script.onload = () => {
      if ((window as GoogleWindow).google?.accounts?.id) resolve();
      else {
        googleScriptLoad = undefined;
        reject(new Error('Google sign-in could not be initialized.'));
      }
    };
    script.onerror = () => {
      googleScriptLoad = undefined;
      reject(new Error('Could not load Google sign-in. Check your connection and try again.'));
    };
    document.head.appendChild(script);
  });
  return googleScriptLoad;
}

export default function GoogleSignInButton({ onSignIn, onError }: {
  onSignIn: (idToken: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const handlersRef = useRef({ onSignIn, onError });
  handlersRef.current = { onSignIn, onError };
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!googleWebClientId || isNative || !buttonRef.current) return;
    let cancelled = false;
    let signingIn = false;

    const renderGoogleButton = async () => {
      try {
        if (cancelled || signingIn) return;
        const { nonce } = await api.getGoogleAuthChallenge();
        await loadGoogleIdentityScript();
        if (cancelled || !buttonRef.current) return;
        const google = (window as GoogleWindow).google;
        if (!google) throw new Error('Google sign-in could not be initialized.');
        buttonRef.current.replaceChildren();
        google.accounts.id.initialize({
          client_id: googleWebClientId,
          nonce,
          cancel_on_tap_outside: true,
          callback: (response) => {
            if (!response.credential) {
              handlersRef.current.onError('Google did not return a sign-in token. Please try again.');
              void renderGoogleButton();
              return;
            }
            if (signingIn) return;
            signingIn = true;
            setLoading(true);
            let succeeded = false;
            handlersRef.current.onSignIn(response.credential)
              .then(() => { succeeded = true; })
              .catch((error: unknown) => {
                handlersRef.current.onError(error instanceof Error ? error.message : 'Google sign-in failed.');
              })
              .finally(() => {
                setLoading(false);
                signingIn = false;
                if (!succeeded && !cancelled) void renderGoogleButton();
              });
          },
        });
        google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: Math.min(360, Math.max(240, Math.floor(buttonRef.current.clientWidth))),
          logo_alignment: 'left',
        });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Google sign-in is unavailable.';
        handlersRef.current.onError(message);
      }
    };

    void renderGoogleButton();
    return () => { cancelled = true; };
  }, [isNative]);

  if (!googleWebClientId) return null;

  const handleNativeSignIn = async () => {
    if (loading) return;
    setLoading(true);
    onError('');
    try {
      const { nonce } = await api.getGoogleAuthChallenge();
      if (!nativeInitialize) {
        nativeInitialize = import('@capgo/capacitor-social-login').then(async ({ SocialLogin }) => {
          await SocialLogin.initialize({ google: { webClientId: googleWebClientId } });
          return SocialLogin;
        }).catch((error: unknown) => {
          nativeInitialize = undefined;
          throw error;
        });
      }
      const socialLogin = await nativeInitialize;
      const { result } = await socialLogin.login({
        provider: 'google',
        options: { nonce },
      });
      const idToken = 'idToken' in result ? result.idToken : undefined;
      if (!idToken) {
        throw new Error('Google did not return a sign-in token. Please try again.');
      }
      await onSignIn(idToken);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isNative) {
    return (
      <div className="zq-google-auth">
        <button type="button" className="zq-google-btn" onClick={handleNativeSignIn} disabled={loading}>
          <GoogleMark />
          <span>{loading ? 'Connecting to Google…' : 'Continue with Google'}</span>
        </button>
        <span className="zq-google-auth-caption">Secure Google sign-in</span>
      </div>
    );
  }

  return (
    <div className="zq-google-auth">
      <div ref={buttonRef} className="zq-google-web-button" aria-busy={loading} />
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" width="20" height="20">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z" />
      <path fill="#FBBC05" d="M12.6 27.5a12 12 0 0 1 0-7v-5.3H5.8a20 20 0 0 0 0 17.6l6.8-5.3Z" />
      <path fill="#EA4335" d="M24 12.1c3 0 5.6 1 7.7 3.1l5.8-5.8C34 6.1 29.5 4 24 4A20 20 0 0 0 5.8 15.2l6.8 5.3c1.6-4.8 6.1-8.4 11.4-8.4Z" />
    </svg>
  );
}
