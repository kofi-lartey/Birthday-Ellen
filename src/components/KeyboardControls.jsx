import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

const KeyboardControls = ({ onNext, onPrev, onTogglePlay, onToggleMusic, onCloseModal }) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.key) {
        case 'ArrowRight':
          onNext();
          break;
        case 'ArrowLeft':
          onPrev();
          break;
        case ' ': // Spacebar
          onTogglePlay();
          break;
        case 'm':
          onToggleMusic();
          break;
        case 'Escape':
          onCloseModal();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onTogglePlay, onToggleMusic, onCloseModal]);

  return null; // This component does not render anything visually
};

KeyboardControls.propTypes = {
  onNext: PropTypes.func.isRequired,
  onPrev: PropTypes.func.isRequired,
  onTogglePlay: PropTypes.func.isRequired,
  onToggleMusic: PropTypes.func.isRequired,
  onCloseModal: PropTypes.func.isRequired,
};

export default KeyboardControls;