import React, { useEffect, useState } from 'react';

const InstallButton = () => {
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    const handleAppInstalled = () => {
      // Hide the install button after installation
      setShowInstallButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    // Hide the install button
    setShowInstallButton(false);
    // Show the prompt
    if (deferredPrompt) {
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      // Reset the deferred prompt variable
      setDeferredPrompt(null);
    }
  };

  if (!showInstallButton) {
    return null;
  }

  return (
    <button
      onClick={handleInstall}
      className="fixed bottom-20 right-5 z-50 bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 px-6 rounded-full shadow-lg transform transition-all duration-300 ease-in-out animate-bounce hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-pink-500"
      aria-label="Install HappyMoment App"
    >
      Install App
    </button>
  );
};

export default InstallButton;