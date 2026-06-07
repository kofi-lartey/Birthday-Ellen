const fs = require('fs');

const files = [
  'src/pages/Slideshow.jsx',
  'src/pages/EventView.jsx',
  'src/pages/Birthday.jsx',
  'src/pages/SelectPackage.jsx',
  'src/App.jsx',
  'src/components/InstallButton.jsx',
  'src/pages/Dashboard.jsx',
  'src/pages/Register.jsx',
  'src/pages/Login.jsx',
  'src/pages/ForgotPassword.jsx',
  'src/pages/PaymentDetails.jsx',
  'src/pages/AuthCallback.jsx',
  'src/pages/CreateEvent.jsx',
  'src/pages/Upload.jsx',
  'src/pages/OrderUpload.jsx',
  'src/pages/Order.jsx',
  'src/pages/Welcome.jsx',
  'src/pages/Gift.jsx',
  'src/pages/ClaimGift.jsx',
  'src/pages/Locked.jsx',
  'src/pages/Home.jsx',
  'src/pages/OrderStatus.jsx',
  'src/pages/EditEvent.jsx',
  'src/pages/AnniversaryView.jsx',
  'src/pages/WeddingView.jsx',
  'src/pages/HangoutView.jsx',
  'src/pages/CreateParty.jsx',
  'src/pages/EditOtherEvent.jsx',
  'src/pages/CreateOtherEvent.jsx',
  'src/pages/CreateAnniversary.jsx',
  'src/pages/OtherEventView.jsx',
  'src/pages/PartyView.jsx',
  'src/pages/EditWedding.jsx',
  'src/pages/CreateWedding.jsx',
  'src/pages/EditHangout.jsx',
  'src/pages/EditParty.jsx',
  'src/pages/EditAnniversary.jsx',
  'src/pages/CreateHangout.jsx',
];

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log('SKIP (not found):', filePath);
    return 0;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;

  // Replacements: [corrupt_mojibake, proper_emoji]
  const replacements = [
    // Slideshow.jsx - getEventText
    ['🎂', '🎂'],
    ['💝', '💝'],
    ['💕', '💕'],
    ['🎉', '🎉'],
    ['👋', '👋'],
    ['✨', '✨'],
    // slideshow.jsx - createHearts symbol arrays
    // birthday
    ['🎂', '🎂'],
    ['🎈', '🎈'],
    ['🎁', '🎁'],
    ['🎉', '🎉'],
    ['✨', '✨'],
    ['💖', '💖'],
    ['🎊', '🎊'],
    ['❤️', '❤️'],
    ['💕', '💕'],
    ['💗', '💗'],
    // wedding
    ['💝', '💝'],
    ['💒', '💒'],
    ['💕', '💕'],
    ['🌸', '🌸'],
    ['✨', '✨'],
    ['💖', '💖'],
    ['🥂', '🥂'],
    ['❤️', '❤️'],
    ['💗', '💗'],
    ['🌹', '🌹'],
    // anniversary
    ['💕', '💕'],
    ['❤️', '❤️'],
    ['💖', '💖'],
    ['💗', '💗'],
    ['💝', '💝'],
    ['💘', '💘'],
    ['🌹', '🌹'],
    ['✨', '✨'],
    ['🎉', '🎉'],
    ['💐', '💐'],
    // party
    ['🎉', '🎉'],
    ['🎈', '🎈'],
    ['🎊', '🎊'],
    ['🎪', '🎪'],
    ['✨', '✨'],
    ['💃', '💃'],
    ['🕺', '🕺'],
    ['🎵', '🎵'],
    ['🎶', '🎶'],
    ['🥳', '🥳'],
    ['🎸', '🎸'],
    // hangout
    ['👋', '👋'],
    ['😎', '😎'],
    ['✨', '✨'],
    ['🎮', '🎮'],
    ['🍕', '🍕'],
    ['🎵', '🎵'],
    ['💬', '💬'],
    ['🎉', '🎉'],
    ['🍔', '🍔'],
    ['🎧', '🎧'],
    // other
    ['✨', '✨'],
    ['🎉', '🎉'],
    ['💫', '💫'],
    ['⭐', '⭐'],
    ['🌟', '🌟'],
    ['🎈', '🎈'],
    ['🎊', '🎊'],
    ['❤️', '❤️'],
    ['💕', '💕'],
    ['🎀', '🎀'],
    // cloud
    ['☁️', '☁️'],
    // FIX comments
    ['⭐', '⭐'],
    // em dash
    ['—', '—'],
    // share/link icons
    ['📥', '📥'],
    ['📺', '📺'],
    ['🔄', '🔄'],
    ['🎬', '🎬'],
    ['📦', '📦'],
    ['📸', '📸'],
  ];

  for (const [corrupt, proper] of replacements) {
    if (corrupt === proper) continue; // skip placeholder
    const parts = content.split(corrupt);
    if (parts.length > 1) {
      content = parts.join(proper);
      changes += parts.length - 1;
    }
  }

  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('FIXED:', filePath, '(', changes, 'replacements )');
  }

  return changes;
}

let totalChanges = 0;
files.forEach(f => {
  totalChanges += fixFile(f);
});

console.log('\nTotal emoji replacements across all files:', totalChanges);
