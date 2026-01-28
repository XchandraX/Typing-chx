// ============================================
// VARIABEL GLOBAL & INISIALISASI
// ============================================

let appData = {};               // Data kata dari JSON
let db;                         // Instance IndexedDB
let currentLang = 'id';         // Bahasa saat ini
let currentLevel = 1;           // Level kata saat ini
let currentPage = 1;            // Halaman dashboard saat ini
const rowsPerPage = 10;         // Jumlah baris per halaman
let filteredData = [];          // Data yang difilter untuk dashboard

// Variabel Engine Typing
let targetText = "";            // Teks target yang harus diketik
let currentIndex = 0;           // Posisi karakter saat ini
let errors = 0;                 // Jumlah kesalahan
let isStarted = false;          // Status apakah test sudah dimulai
let startTime, timerInterval;   // Timer untuk menghitung waktu

// Variabel Keyboard
let isShiftActive = false;      // Status tombol Shift
let isCapsLockActive = false;   // Status Caps Lock
let showColors = true;          // Mode warna keyboard (Pro/Pemula)

// Variabel Mode & Fitur
let lastTargetText = "";        // Teks terakhir untuk mode ulang
let currentReplayData = [];     // Data replay saat ini
let lastReplayData = [];        // Data replay sebelumnya (untuk ghost mode)
let isRepeatMode = false;       // Status mode ulang
let ghostInterval;              // Interval untuk ghost animation
let currentLength = 'medium';   // Panjang teks saat ini

// Variabel Tantangan
let isSuddenDeath = false;      // Mode Sudden Death (1 kesalahan = gagal)
let isChallengeMode = false;    // Status mode tantangan aktif
let currentChallengeName = null;// Nama tantangan saat ini
let maxWPM = 0;                 // Rekor WPM tertinggi user
let isNoSpaceMode = false;      // Mode tanpa spasi
let isExcludeMode = false;      // Mode dengan huruf terlarang
let excludedChars = "";         // Huruf-huruf yang dilarang
let isTimerChallenge = false;   // Mode time attack
let challengeTimeLimit = 30;    // Batas waktu untuk time attack
let isNumericChallenge = false; // Mode dengan angka
let isSymbolChallenge = false;  // Mode dengan simbol

// Variabel Level Kata untuk Tantangan
let challengeWordLevel = 1;     // Level kata untuk tantangan

// Variabel Audio
let isSoundEnabled = true;      // Status efek suara
let isMusicEnabled = false;     // Status musik background
let clickSound, errorSound, bgMusic; // Objek audio

// Variabel Ghost Race
let ghostPosition = 0;          // Posisi ghost saat ini
let ghostStartTime = 0;         // Waktu mulai ghost

// ============================================
// SISTEM LEVEL TANTANGAN
// ============================================

// Konfigurasi tantangan
let challengeLevels = {};       // Level setiap tantangan per level kata
let challengeXP = {};           // XP setiap tantangan per level kata
let currentWordLevel = 1;       // Level kata global

// Requirement untuk setiap jenis tantangan
let challengeRequirements = {
    'numeric': {
        baseXP: 100,
        levelMultiplier: 1.5,
        difficulty: 'easy',
        color: 'mode-green',
        baseWPM: 35,
        wpmIncrement: 10,
        unlockWPM: 20,
        icon: '🔢'
    },
    'symbol': {
        baseXP: 120,
        levelMultiplier: 1.6,
        difficulty: 'medium',
        color: 'mode-orange',
        baseWPM: 40,
        wpmIncrement: 10,
        unlockWPM: 25,
        icon: '#️⃣'
    },
    'sudden': {
        baseXP: 150,
        levelMultiplier: 1.7,
        difficulty: 'hard',
        color: 'mode-red',
        baseWPM: 45,
        wpmIncrement: 10,
        unlockWPM: 30,
        icon: '💀'
    },
    'exclude': {
        baseXP: 180,
        levelMultiplier: 1.8,
        difficulty: 'expert',
        color: 'mode-purple',
        baseWPM: 50,
        wpmIncrement: 15,
        unlockWPM: 35,
        icon: '🚫'
    },
    'nospace': {
        baseXP: 200,
        levelMultiplier: 1.9,
        difficulty: 'hard',
        color: 'mode-blue',
        baseWPM: 55,
        wpmIncrement: 10,
        unlockWPM: 40,
        icon: '🚧'
    },
    'ghost': {
        baseXP: 250,
        levelMultiplier: 2.0,
        difficulty: 'expert',
        color: 'mode-ghost',
        baseWPM: 60,
        wpmIncrement: 15,
        unlockWPM: 50,
        icon: '👻'
    },
    'timer': {
        baseXP: 300,
        levelMultiplier: 2.1,
        difficulty: 'master',
        color: 'mode-orange',
        baseWPM: 65,
        wpmIncrement: 10,
        unlockWPM: 60,
        icon: '⏱️'
    }
};

// Feedback untuk hasil typing
const typingFeedbacks = {
    luarBiasa: ["Luar biasa!", "Kecepatan dewa!", "Sangat impresif!", "Jari kilat!", "Hebat sekali!"],
    bagus: ["Kerja bagus!", "Pertahankan!", "Meningkat pesat.", "Konsisten!", "Mantap!"],
    kurang: ["Jangan menyerah.", "Fokus akurasi.", "Coba lagi.", "Santai saja.", "Ayo semangat!"],
    dukungan: ["Permulaan yang baik.", "Pelan asal benar.", "Nikmati prosesnya.", "Terus berlatih.", "Semangat!"]
};

// ============================================
// FUNGSI INISIALISASI & DATABASE
// ============================================

/**
 * Memuat konfigurasi kata dari file JSON
 */
async function loadConfig() {
    try {
        const response = await fetch('words.json');
        appData = await response.json();
        initDB();
    } catch (error) {
        console.error("Gagal memuat words.json:", error);
        alert("Gagal memuat data kata. Pastikan file words.json ada di folder yang sama.");
    }
}

/**
 * Migrasi data lama ke sistem level per-level kata
 */
function migrateOldData() {
    // Cek jika ada data lama
    const oldLevels = localStorage.getItem('challengeLevels');
    const oldXP = localStorage.getItem('challengeXP');

    if (oldLevels && !localStorage.getItem('challengeLevelsByLevel')) {
        console.log('Migrating old data to new per-level system...');

        const oldLevelsData = JSON.parse(oldLevels);
        const oldXPData = JSON.parse(oldXP || '{}');

        // Migrasikan ke semua level
        challengeLevels = {};
        challengeXP = {};

        for (let level = 1; level <= 5; level++) {
            const key = `level-${level}`;
            challengeLevels[key] = { ...oldLevelsData };
            challengeXP[key] = { ...oldXPData };
        }

        // Simpan data baru
        localStorage.setItem('challengeLevelsByLevel', JSON.stringify(challengeLevels));
        localStorage.setItem('challengeXPByLevel', JSON.stringify(challengeXP));

        console.log('Migration complete!');

        // Hapus data lama
        localStorage.removeItem('challengeLevels');
        localStorage.removeItem('challengeXP');
    }
}

/**
 * Inisialisasi IndexedDB
 */
function initDB() {
    const request = indexedDB.open("TypingMasterDB", 2);

    request.onupgradeneeded = e => {
        db = e.target.result;
        if (!db.objectStoreNames.contains("scores")) {
            db.createObjectStore("scores", { keyPath: "id", autoIncrement: true });
        }
    };

    request.onsuccess = e => {
        db = e.target.result;

        // Migrasi data lama jika perlu
        migrateOldData();

        initChallengeLevels();

        getHistory((history) => {
            if (history && history.length > 0) {
                maxWPM = Math.max(...history.map(h => h.wpm));
                console.log('Initial maxWPM loaded:', maxWPM);
            }

            updateAllChallengeCards();
            updateChallengeWordLevelUI();
            updateUnlockedCount();
            renderNewTest();
        });
    };

    request.onerror = e => {
        console.error("Database error:", e);
        renderNewTest();
    };
}

/**
 * Mendapatkan history dari database
 */
function getHistory(callback) {
    if (!db) return;
    const transaction = db.transaction("scores", "readonly");
    const request = transaction.objectStore("scores").getAll();
    request.onsuccess = e => callback(e.target.result);
}

// ============================================
// FUNGSI SISTEM LEVEL TANTANGAN
// ============================================

/**
 * Mendapatkan kunci untuk level tertentu
 */
function getChallengeKey(level = currentWordLevel) {
    return `level-${level}`;
}

/**
 * Inisialisasi data level tantangan
 */
function initChallengeLevels() {
    const savedLevels = localStorage.getItem('challengeLevelsByLevel');
    const savedXP = localStorage.getItem('challengeXPByLevel');
    const savedWordLevel = localStorage.getItem('currentWordLevel');

    if (savedLevels) {
        challengeLevels = JSON.parse(savedLevels);
    } else {
        // Inisialisasi untuk semua level (1-5)
        challengeLevels = {};
        for (let level = 1; level <= 5; level++) {
            challengeLevels[`level-${level}`] = {};
            Object.keys(challengeRequirements).forEach(challenge => {
                challengeLevels[`level-${level}`][challenge] = 1;
            });
        }
    }

    if (savedXP) {
        challengeXP = JSON.parse(savedXP);
    } else {
        // Inisialisasi XP untuk semua level
        challengeXP = {};
        for (let level = 1; level <= 5; level++) {
            challengeXP[`level-${level}`] = {};
            Object.keys(challengeRequirements).forEach(challenge => {
                challengeXP[`level-${level}`][challenge] = 0;
            });
        }
    }

    if (savedWordLevel) {
        currentWordLevel = parseInt(savedWordLevel);
        challengeWordLevel = currentWordLevel;
        document.getElementById('challenge-word-level').value = currentWordLevel;
        document.getElementById('level-selector').value = currentWordLevel;
        currentLevel = currentWordLevel;
    }

    updateAllChallengeCards();
}

/**
 * Mendapatkan XP yang dibutuhkan untuk naik level
 */
function getXPForLevel(level) {
    const xpRequirements = {
        1: 100,   // Level 1 → 2
        2: 200,   // Level 2 → 3  
        3: 350,   // Level 3 → 4
        4: 550,   // Level 4 → 5
        5: 800,   // Level 5 → 6 (Super Star)
        6: 1200   // Level 6 → 7 (MAX)
    };
    return xpRequirements[level] || 1200;
}

/**
 * Cek dan tampilkan tombol level up untuk semua tantangan
 */
function checkAndShowLevelUpButtons() {
    Object.keys(challengeRequirements).forEach(challengeType => {
        checkChallengeLevelUp(challengeType);
    });
}

/**
 * Cek apakah tantangan tertentu bisa naik level
 */
function checkChallengeLevelUp(challengeType) {
    const key = getChallengeKey();
    const currentData = getCurrentChallengeData(challengeType);
    const level = currentData.level;
    const xp = currentData.xp;

    if (level >= 6) return; // Sudah max level

    const xpNeeded = getXPForLevel(level);
    const wpmNeeded = getWPMRequirement(challengeType, level + 1);

    // Cek apakah bisa naik level
    const canLevelUp = (xp >= xpNeeded && maxWPM >= wpmNeeded);

    // Update kartu tantangan
    updateLevelUpButtonOnCard(challengeType, canLevelUp, level + 1, wpmNeeded);

    // Update badge di typing page jika tantangan aktif
    if (isChallengeMode && getCurrentChallengeType() === challengeType) {
        updateLevelUpBadgeInTypingPage(challengeType, canLevelUp, level + 1, wpmNeeded);
    }
}

/**
 * Update tombol level up pada kartu tantangan
 */
function updateLevelUpButtonOnCard(challengeType, canLevelUp, nextLevel, wpmNeeded) {
    const elementIdMap = {
        'numeric': 'card-numeric-challenge',
        'symbol': 'card-symbol-challenge',
        'sudden': 'card-sudden-death',
        'exclude': 'card-exclude-mode',
        'nospace': 'card-no-space',
        'ghost': 'card-ghost-race',
        'timer': 'card-timer-challenge'
    };

    const elementId = elementIdMap[challengeType];
    if (!elementId) return;

    const card = document.getElementById(elementId);
    if (!card) return;

    // Hapus tombol sebelumnya jika ada
    const oldBtn = card.querySelector('.level-up-btn-container');
    if (oldBtn) oldBtn.remove();

    // Hapus class animasi sebelumnya
    card.classList.remove('level-up-available');

    if (canLevelUp) {
        // Tambah class animasi
        card.classList.add('level-up-available');

        // Buat container tombol
        const btnContainer = document.createElement('div');
        btnContainer.className = 'level-up-btn-container';

        // Buat tombol
        const levelUpBtn = document.createElement('button');
        levelUpBtn.className = 'level-up-btn';
        levelUpBtn.innerHTML = '⬆ Level Up!';
        levelUpBtn.onclick = (e) => {
            e.stopPropagation(); // Mencegah trigger klik kartu
            manualLevelUp(challengeType);
        };

        // Tambahkan tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'level-up-notification';
        tooltip.textContent = `Naik ke Level ${nextLevel}\nButuh ${wpmNeeded} WPM`;

        btnContainer.appendChild(levelUpBtn);
        btnContainer.appendChild(tooltip);

        // Cari elemen challenge-info untuk memasang tombol
        const infoElement = card.querySelector('.challenge-info');
        if (infoElement) {
            infoElement.appendChild(btnContainer);
        }

        // Update XP display styling
        const xpElement = card.querySelector('.challenge-xp');
        if (xpElement) {
            xpElement.classList.add('ready');
        }

        // Update progress bar styling
        const progressFill = card.querySelector('.level-progress-fill');
        if (progressFill) {
            progressFill.classList.add('ready');
            progressFill.classList.add('full');
        }
    } else {
        // Hapus styling ready jika tidak bisa naik level
        const xpElement = card.querySelector('.challenge-xp');
        if (xpElement) {
            xpElement.classList.remove('ready');
        }

        const progressFill = card.querySelector('.level-progress-fill');
        if (progressFill) {
            progressFill.classList.remove('ready');

            // Cek apakah XP sudah penuh tapi belum bisa naik karena WPM
            const currentData = getCurrentChallengeData(challengeType);
            const xp = currentData.xp;
            const xpNeeded = getXPForLevel(currentData.level);

            if (xp >= xpNeeded) {
                progressFill.classList.add('full');
            } else {
                progressFill.classList.remove('full');
            }
        }
    }
}

/**
 * Update badge level up di halaman typing
 */
function updateLevelUpBadgeInTypingPage(challengeType, canLevelUp, nextLevel, wpmNeeded) {
    const container = document.getElementById('active-challenge-display');
    if (!container) {
        console.error('active-challenge-display not found!');
        return;
    }

    // Hanya tampilkan jika sedang dalam mode tantangan
    if (!isChallengeMode || !currentChallengeName) {
        console.log('Not in challenge mode or no challenge name');
        return;
    }

    // Pastikan challengeType cocok dengan tantangan aktif
    const currentType = getCurrentChallengeType();
    if (currentType !== challengeType) {
        console.log('Challenge type mismatch:', currentType, '!=', challengeType);
        return;
    }

    // Hapus badge sebelumnya jika ada
    const oldBadge = container.querySelector('.level-up-badge');
    if (oldBadge) oldBadge.remove();

    if (canLevelUp) {
        const badge = document.createElement('div');
        badge.className = 'level-up-badge';
        badge.innerHTML = `
            <span class="level-up-icon">⬆</span>
            <span class="level-up-text">Level Up Available!</span>
            <span class="level-up-tooltip">Klik untuk naik ke Level ${nextLevel}<br>Butuh ${wpmNeeded} WPM</span>
        `;
        badge.title = `Naik ke Level ${nextLevel} | Butuh ${wpmNeeded} WPM`;
        badge.onclick = (e) => {
            e.stopPropagation();
            manualLevelUp(challengeType);
        };

        // Cari active-challenge-tag untuk menambahkan badge di sampingnya
        const challengeTag = container.querySelector('.active-challenge-tag');
        if (challengeTag) {
            challengeTag.parentNode.insertBefore(badge, challengeTag.nextSibling);
        } else {
            container.appendChild(badge);
        }

        console.log('Level up badge added to typing page');
    }
}

/**
 * Manual level up untuk tantangan tertentu
 */
function manualLevelUp(challengeType) {
    const key = getChallengeKey();
    const currentData = getCurrentChallengeData(challengeType);
    const level = currentData.level;
    const xp = currentData.xp;

    if (level >= 6) {
        showErrorAlert("Sudah mencapai level maksimum!");
        return;
    }

    const xpNeeded = getXPForLevel(level);
    const wpmNeeded = getWPMRequirement(challengeType, level + 1);

    // Validasi
    if (xp < xpNeeded) {
        showErrorAlert(`XP belum cukup! Butuh ${xpNeeded} XP, Anda memiliki ${xp} XP.`);
        return;
    }

    if (maxWPM < wpmNeeded) {
        showErrorAlert(`WPM belum cukup! Butuh ${wpmNeeded} WPM, rekor Anda ${maxWPM} WPM.`);
        return;
    }

    // Naik level
    const newLevel = level + 1;
    let newXP = xp - xpNeeded;

    // Jika naik ke super star, reset XP
    if (newLevel === 6) {
        newXP = 0;
    }

    // Update data
    setCurrentChallengeData(challengeType, newLevel, newXP);

    // Update UI
    updateChallengeCard(challengeType);

    // Tampilkan notifikasi
    showLevelUpNotification(challengeType, newLevel, maxWPM);

    // Refresh tombol level up
    setTimeout(() => {
        checkAndShowLevelUpButtons();
    }, 100);
}

/**
 * Tampilkan notifikasi level up berhasil
 */
function showLevelUpSuccess(challengeType, newLevel) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 10001;
        animation: slideInRight 0.5s ease;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        border-left: 4px solid #d97706;
        max-width: 300px;
    `;

    const challengeNames = {
        'numeric': 'Numeric Master',
        'symbol': 'Symbolic Pro',
        'sudden': 'Sudden Death',
        'exclude': 'Forbidden Letters',
        'nospace': 'No Space Zone',
        'ghost': 'Ghost Race',
        'timer': 'Time Attack'
    };

    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 24px;">🎉</span>
            <div>
                <strong style="font-size: 1.1rem;">LEVEL UP BERHASIL!</strong>
                <div style="font-size: 0.9rem; opacity: 0.9;">
                    ${challengeNames[challengeType]} - Level ${newLevel}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

/**
 * Cek apakah bisa naik level
 */
function canLevelUp(challengeType, level, wpm) {
    const nextWPMReq = getWPMRequirement(challengeType, level + 1);
    const hasWPM = wpm >= nextWPMReq;
    const hasXP = (challengeXP[getChallengeKey()]?.[challengeType] || 0) >= getXPForLevel(level);

    return hasWPM && hasXP && level < 6;
}

/**
 * Mendapatkan requirement WPM untuk level tertentu
 */
function getWPMRequirement(challengeType, level) {
    const req = challengeRequirements[challengeType];
    if (!req) return 35;

    if (level === 6) return 90; // Super star requirement
    return req.baseWPM + (req.wpmIncrement * (level - 1));
}

/**
 * Mendapatkan requirement WPM untuk level kata
 */
function getWordLevelWPMRequirement(level) {
    const requirements = {
        1: 0,
        2: 20,
        3: 30,
        4: 40,
        5: 50
    };
    return requirements[level] || 0;
}

/**
 * Menghitung XP yang didapat dari sesi bermain
 */
function calculateXP(wpm, accuracy, challengeType, currentLevel) {
    // BASE XP: Dapat XP minimal setiap kali main
    let baseXP = 20; // XP dasar untuk setiap session

    // BONUS WPM: Semakin tinggi WPM, semakin banyak XP
    const reqWPM = getWPMRequirement(challengeType, currentLevel);
    let wpmBonus = 0;

    if (wpm >= reqWPM * 1.5) {
        wpmBonus = 50; // Sangat cepat
    } else if (wpm >= reqWPM * 1.2) {
        wpmBonus = 30; // Cepat
    } else if (wpm >= reqWPM) {
        wpmBonus = 15; // Memenuhi target
    } else if (wpm >= reqWPM * 0.8) {
        wpmBonus = 10; // Mendekati target
    } else if (wpm >= reqWPM * 0.5) {
        wpmBonus = 5; // Setengah target
    } else {
        wpmBonus = 2; // Minimal
    }

    // BONUS AKURASI: Semakin akurat, semakin banyak XP
    let accuracyBonus = 0;
    if (accuracy >= 98) {
        accuracyBonus = 25; // Hampir sempurna
    } else if (accuracy >= 95) {
        accuracyBonus = 15; // Sangat akurat
    } else if (accuracy >= 90) {
        accuracyBonus = 10; // Akurat
    } else if (accuracy >= 85) {
        accuracyBonus = 5; // Lumayan
    } else {
        accuracyBonus = 0; // Tidak ada bonus
    }

    // BONUS LEVEL TINGGI: Tantangan lebih sulit = lebih banyak XP
    let levelBonus = Math.min(currentLevel * 3, 15); // Max 15 bonus

    // BONUS CHAIN: Jika berhasil beberapa kali berturut-turut
    let chainBonus = 0;
    if (typeof window.challengeChain === 'undefined') window.challengeChain = {};
    if (!window.challengeChain[challengeType]) window.challengeChain[challengeType] = 0;

    if (accuracy >= 85) { // Minimal 85% akurasi untuk chain
        window.challengeChain[challengeType]++;
        chainBonus = Math.min(window.challengeChain[challengeType] * 2, 10); // Max 10 bonus
    } else {
        window.challengeChain[challengeType] = 0; // Reset chain
    }

    // TOTAL XP
    let totalXP = baseXP + wpmBonus + accuracyBonus + levelBonus + chainBonus;

    // CAP PER SESSION: Maksimal 100 XP per session
    totalXP = Math.min(totalXP, 100);

    console.log(`XP Breakdown for ${challengeType}:`, {
        baseXP,
        wpmBonus,
        accuracyBonus,
        levelBonus,
        chainBonus,
        totalXP,
        chainCount: window.challengeChain[challengeType] || 0
    });

    return totalXP;
}

/**
 * Menambahkan XP untuk tantangan tertentu
 */
function addChallengeXP(challengeType, wpm, accuracy) {
    if (!challengeType || challengeType === 'Normal') {
        console.log("addChallengeXP: Invalid challenge type", challengeType);
        return null;
    }

    const key = getChallengeKey();
    const currentLevel = challengeLevels[key]?.[challengeType] || 1;
    const currentXP = challengeXP[key]?.[challengeType] || 0;

    // SELALU hitung XP, tidak peduli apakah mencapai target WPM atau tidak
    const xpGained = calculateXP(wpm, accuracy, challengeType, currentLevel);
    const newXP = currentXP + xpGained;

    // Pastikan struktur data ada
    if (!challengeLevels[key]) challengeLevels[key] = {};
    if (!challengeXP[key]) challengeXP[key] = {};

    // Simpan data
    challengeLevels[key][challengeType] = currentLevel;
    challengeXP[key][challengeType] = newXP;

    // Simpan ke localStorage
    localStorage.setItem('challengeLevelsByLevel', JSON.stringify(challengeLevels));
    localStorage.setItem('challengeXPByLevel', JSON.stringify(challengeXP));

    // Update UI
    updateChallengeCard(challengeType);

    // Cek dan tampilkan tombol level up
    setTimeout(() => {
        checkChallengeLevelUp(challengeType);
    }, 500);

    // Return data penting untuk ditampilkan
    return {
        xpGained,  // XP yang didapat kali ini
        newXP,     // Total XP baru
        currentLevel,
        canLevelUp: checkIfCanLevelUp(challengeType, newXP, currentLevel),
        wpmRequired: getWPMRequirement(challengeType, currentLevel + 1)
    };
}

/**
 * Cek apakah bisa naik level
 */
function checkIfCanLevelUp(challengeType, currentXP, currentLevel) {
    if (currentLevel >= 6) return false;

    const xpNeeded = getXPForLevel(currentLevel);
    const wpmNeeded = getWPMRequirement(challengeType, currentLevel + 1);

    return (currentXP >= xpNeeded && maxWPM >= wpmNeeded);
}

/**
 * Tampilkan notifikasi level up
 */
function showLevelUpNotification(challengeType, newLevel, wpm) {
    const challengeNames = {
        'numeric': 'Numeric Master',
        'symbol': 'Symbolic Pro',
        'sudden': 'Sudden Death',
        'exclude': 'Forbidden Letters',
        'nospace': 'No Space Zone',
        'ghost': 'Ghost Race',
        'timer': 'Time Attack'
    };

    const isSuperStar = newLevel === 6;
    const icon = isSuperStar ? '🌟' : '⭐';
    const title = isSuperStar ? 'SUPER STAR UNLOCKED!' : 'LEVEL UP!';

    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${isSuperStar ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 10000;
        animation: slideInRight 0.5s ease;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        border-left: 4px solid ${isSuperStar ? '#f59e0b' : '#fbbf24'};
        max-width: 300px;
    `;

    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 28px;">${icon}</span>
            <div>
                <strong style="font-size: 1.1rem;">${title}</strong>
                <div style="font-size: 0.9rem; opacity: 0.9;">
                    ${challengeNames[challengeType]} - Level ${newLevel}
                </div>
                <div style="font-size: 0.8rem; margin-top: 3px;">
                    WPM: ${wpm} | Next: ${getWPMRequirement(challengeType, newLevel + 1)} WPM
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 4000);
}

// ============================================
// FUNGSI UI & NAVIGASI
// ============================================

/**
 * Tampilkan alert modal
 */
function showAlert(title, message, isSuccess = true) {
    const modal = document.getElementById('custom-alert');
    const icon = document.getElementById('modal-icon');
    const titleEl = document.getElementById('modal-title');
    const msgEl = document.getElementById('modal-message');

    icon.innerText = isSuccess ? "🎉" : "⚠️";
    titleEl.innerText = title;
    titleEl.style.color = isSuccess ? "var(--primary)" : "var(--error)";
    msgEl.innerText = message;

    modal.style.display = 'flex';
}

/**
 * Tutup modal
 */
function closeModal() {
    document.getElementById('custom-alert').style.display = 'none';

    if (ghostInterval) {
        clearInterval(ghostInterval);
        ghostInterval = null;
    }

    if (isSuddenDeath && !isStarted) {
        renderNewTest();
    } else {
        isRepeatMode = false;
        renderNewTest();
    }
}

// ============================================
// SISTEM AUDIO
// ============================================

/**
 * Inisialisasi sistem audio
 */
function initAudio() {
    clickSound = new Audio('music/click.mp3');
    errorSound = new Audio('music/error.mp3');
    bgMusic = new Audio('music/bg-music.mp3');

    clickSound.volume = 0.9;
    errorSound.volume = 0.5;
    bgMusic.volume = 0.4;
    bgMusic.loop = true;

    // Load pengaturan dari localStorage
    const savedSound = localStorage.getItem('soundEnabled');
    const savedMusic = localStorage.getItem('musicEnabled');

    if (savedSound !== null) {
        isSoundEnabled = savedSound === 'true';
    }

    if (savedMusic !== null) {
        isMusicEnabled = savedMusic === 'true';
    }

    // Update UI toggle buttons
    const soundBtn = document.getElementById('sound-toggle');
    const musicBtn = document.getElementById('music-toggle');

    if (soundBtn) {
        soundBtn.classList.toggle('active', isSoundEnabled);
        soundBtn.innerText = isSoundEnabled ? '🔊' : '🔇';
    }

    if (musicBtn) {
        musicBtn.classList.toggle('active', isMusicEnabled);
        musicBtn.innerText = isMusicEnabled ? '🎵' : '🔇';

        // Auto-play music jika dienable
        if (isMusicEnabled && bgMusic) {
            bgMusic.play().catch(e => console.log("Background music failed:", e));
        }
    }
}

/**
 * Memainkan suara berdasarkan tipe
 */
function playSound(type) {
    if (!isSoundEnabled) return;

    try {
        if (type === 'correct' && clickSound) {
            clickSound.currentTime = 0;
            clickSound.play().catch(e => console.log("Audio play failed:", e));
        } else if (type === 'error' && errorSound) {
            errorSound.currentTime = 0;
            errorSound.play().catch(e => console.log("Audio play failed:", e));
        }
    } catch (error) {
        console.log("Audio error:", error);
    }
}

/**
 * Toggle efek suara
 */
function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    const btn = document.getElementById('sound-toggle');
    btn.classList.toggle('active', isSoundEnabled);
    btn.innerText = isSoundEnabled ? '🔊' : '🔇';

    // Simpan ke localStorage
    localStorage.setItem('soundEnabled', isSoundEnabled.toString());
}

/**
 * Toggle musik background
 */
function toggleMusic() {
    isMusicEnabled = !isMusicEnabled;
    const btn = document.getElementById('music-toggle');
    btn.classList.toggle('active', isMusicEnabled);

    if (isMusicEnabled && bgMusic) {
        bgMusic.play().catch(e => console.log("Background music failed:", e));
    } else if (bgMusic) {
        bgMusic.pause();
        bgMusic.currentTime = 0;
    }

    btn.innerText = isMusicEnabled ? '🎵' : '🔇';

    // Simpan ke localStorage
    localStorage.setItem('musicEnabled', isMusicEnabled.toString());
}

// ============================================
// FUNGSI LEVEL KATA TANTANGAN
// ============================================

/**
 * Update level kata tantangan berdasarkan selektor
 */
function updateChallengeWordLevel() {
    const selector = document.getElementById('challenge-word-level');
    if (selector) {
        const newLevel = parseInt(selector.value);
        challengeWordLevel = newLevel;
        currentWordLevel = newLevel;
        currentLevel = newLevel;

        // Simpan ke localStorage
        localStorage.setItem('currentWordLevel', newLevel.toString());

        // Update juga di halaman typing
        document.getElementById('level-selector').value = newLevel;

        updateChallengeWordLevelUI();
        updateAllChallengeCards();

        console.log(`Changed to word level ${newLevel}. Data loaded for this level.`);
    }
}

/**
 * Update UI level kata tantangan
 */
function updateChallengeWordLevelUI() {
    const levelBadge = document.getElementById('current-challenge-level');
    const wpmReq = document.getElementById('current-wpm-requirement');

    if (levelBadge) {
        const levelNames = {
            1: "Pemula",
            2: "Mudah",
            3: "Normal",
            4: "Sulit",
            5: "Legenda"
        };
        levelBadge.textContent = `Level Kata: ${levelNames[challengeWordLevel] || 'Pemula'}`;
    }

    if (wpmReq) {
        const levelWPM = getWordLevelWPMRequirement(challengeWordLevel);
        wpmReq.textContent = `Req: ${levelWPM} WPM`;

        if (maxWPM >= levelWPM) {
            wpmReq.classList.add('met');
            wpmReq.textContent = `✓ ${levelWPM} WPM`;
        } else {
            wpmReq.classList.remove('met');
        }
    }
}

/**
 * Update semua kartu tantangan
 */
function updateAllChallengeCards() {
    console.log('updateAllChallengeCards called, maxWPM =', maxWPM);

    Object.keys(challengeRequirements).forEach(challenge => {
        updateChallengeCard(challenge);
        checkChallengeLevelUp(challenge);
    });

    updateUnlockedCount();
}

/**
 * Update kartu tantangan spesifik
 */
function updateChallengeCard(challengeType) {
    const elementIdMap = {
        'numeric': 'card-numeric-challenge',
        'symbol': 'card-symbol-challenge',
        'sudden': 'card-sudden-death',
        'exclude': 'card-exclude-mode',
        'nospace': 'card-no-space',
        'ghost': 'card-ghost-race',
        'timer': 'card-timer-challenge'
    };

    const elementId = elementIdMap[challengeType];
    if (!elementId) return;

    const card = document.getElementById(elementId);
    if (!card) return;

    const req = challengeRequirements[challengeType];

    // Dapatkan data untuk level kata SAAT INI
    const currentData = getCurrentChallengeData(challengeType);
    const level = currentData.level;
    const xp = currentData.xp;
    const xpNeeded = getXPForLevel(level);
    const progressPercent = Math.min(100, (xp / xpNeeded) * 100);

    const challengeWPMReq = getWPMRequirement(challengeType, level);
    const wordLevelWPMReq = getWordLevelWPMRequirement(challengeWordLevel);
    const totalWPMReq = Math.max(challengeWPMReq, wordLevelWPMReq);

    // Update UI dengan data dari level saat ini
    const levelBadge = card.querySelector('.badge-mode');
    if (levelBadge) {
        levelBadge.textContent = `Level ${level}`;
        levelBadge.className = `badge-mode ${req.color} difficulty-${req.difficulty}`;
    }

    // Di bagian XP display:
    const xpElement = card.querySelector('.challenge-xp');
    if (xpElement) {
        if (level < 6) {
            xpElement.innerHTML = `${xp}/${xpNeeded} XP`;

            if (xp >= xpNeeded) {
                xpElement.classList.add('ready');
                xpElement.style.color = '#22c55e';
                xpElement.style.fontWeight = 'bold';
            } else {
                xpElement.classList.remove('ready');
                xpElement.style.color = '';
                xpElement.style.fontWeight = '';
            }
        } else {
            xpElement.innerHTML = '⭐ MAX';
            xpElement.style.color = '#fbbf24';
            xpElement.style.fontWeight = 'bold';
        }
    }

    // Progress bar
    const progressFill = card.querySelector('.level-progress-fill');
    if (progressFill) {
        if (level < 6) {
            progressFill.style.width = `${progressPercent}%`;

            // Warna progress bar berdasarkan status
            if (xp >= xpNeeded) {
                progressFill.style.background = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
                progressFill.classList.add('ready');
                progressFill.classList.add('full');
            } else if (progressPercent >= 70) {
                progressFill.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
                progressFill.classList.remove('ready');
            } else if (progressPercent >= 50) {
                progressFill.style.background = 'linear-gradient(90deg, #3b82f6, #60a5fa)';
                progressFill.classList.remove('ready');
            } else {
                progressFill.style.background = 'linear-gradient(90deg, #3b82f6, #8b5cf6)';
                progressFill.classList.remove('ready');
            }
        } else {
            // Level 6 - progress bar full dengan warna emas
            progressFill.style.width = '100%';
            progressFill.style.background = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
            progressFill.classList.add('full');
        }
    }

    // Update stars
    const starsContainer = card.querySelector('.level-stars');
    if (starsContainer) {
        const stars = starsContainer.querySelectorAll('.star:not(.super)');
        const superStar = starsContainer.querySelector('.star.super');

        stars.forEach((star, index) => {
            if (index < Math.min(level, 5)) {
                star.classList.add('filled');
            } else {
                star.classList.remove('filled');
            }
        });

        // Super star logic
        if (superStar) {
            if (level >= 6) {
                superStar.classList.add('filled');
                superStar.classList.remove('disabled');
                superStar.title = "⭐ SUPER STAR LEVEL";
            } else if (level === 5) {
                superStar.classList.remove('filled');
                superStar.classList.add('disabled');
                superStar.title = `Butuh ${getWPMRequirement(challengeType, 6)} WPM untuk unlock Super Star`;
            } else {
                superStar.classList.remove('filled');
                superStar.classList.add('disabled');
                superStar.title = "Unlock di Level 6";
            }
        }
    }

    // Unlock/Lock logic
    const isUnlocked = maxWPM >= req.unlockWPM;

    if (isUnlocked) {
        card.classList.remove('locked');
        card.querySelector('.challenge-status-icon').innerHTML = maxWPM >= totalWPMReq ? "✅" : "⚠️";
        card.style.opacity = "1";
        card.style.filter = "none";
        card.style.cursor = "pointer";
    } else {
        card.classList.add('locked');
        card.querySelector('.challenge-status-icon').innerHTML = "🔒";
        card.style.opacity = "0.6";
        card.style.filter = "grayscale(1)";
        card.style.cursor = "not-allowed";
    }

    // Update WPM requirement display
    const wpmText = card.querySelector('.challenge-level span');
    if (wpmText) {
        if (level < 6) {
            wpmText.textContent = `Req: ${totalWPMReq} WPM`;
            wpmText.style.color = maxWPM >= totalWPMReq ? '#22c55e' : '#f87171';
        } else {
            wpmText.textContent = '⭐ MAX LEVEL';
            wpmText.style.color = '#fbbf24';
            wpmText.style.fontWeight = 'bold';
        }
    }
}

/**
 * Refresh semua UI setelah data siap
 */
function refreshAllUI() {
    getHistory((history) => {
        if (history && history.length > 0) {
            maxWPM = Math.max(...history.map(h => h.wpm));
            console.log('refreshAllUI: maxWPM =', maxWPM);
        } else {
            maxWPM = 0;
        }

        // Update semua UI yang bergantung pada maxWPM
        updateAllChallengeCards();
        updateChallengeWordLevelUI();
        updateUnlockedCount();

        // Force re-render untuk memastikan
        setTimeout(() => {
            updateAllChallengeCards();
        }, 100);
    });
}

/**
 * Update count tantangan yang terbuka
 */
function updateUnlockedCount() {
    let unlockedCount = 0;

    Object.keys(challengeRequirements).forEach(challenge => {
        const req = challengeRequirements[challenge];
        if (maxWPM >= req.unlockWPM) {
            unlockedCount++;
        }
    });

    const countElement = document.getElementById('unlocked-count');
    if (countElement) {
        countElement.textContent = `${unlockedCount}/7`;
    }

    const recordElement = document.getElementById('challenge-record');
    if (recordElement) {
        recordElement.textContent = `${maxWPM} WPM`;
    }

    // Update badge requirement
    const wpmReq = document.getElementById('current-wpm-requirement');
    if (wpmReq) {
        const levelWPM = getWordLevelWPMRequirement(challengeWordLevel);
        wpmReq.textContent = `Req: ${levelWPM} WPM`;

        if (maxWPM >= levelWPM) {
            wpmReq.classList.add('met');
            wpmReq.textContent = `✓ ${levelWPM} WPM`;
        } else {
            wpmReq.classList.remove('met');
        }
    }
}

/**
 * Mendapatkan nama display untuk tantangan
 */
function getChallengeDisplayName(type, level) {
    const names = {
        'numeric': 'Numeric Master',
        'symbol': 'Symbolic Pro',
        'sudden': 'Sudden Death',
        'exclude': 'Forbidden Letters',
        'nospace': 'No Space Zone',
        'ghost': 'Ghost Race',
        'timer': 'Time Attack'
    };

    const isSuperStar = level === 6;
    const starText = isSuperStar ? ' ⭐ SUPER STAR' : '';
    return `${names[type]} - Level ${level}${starText}`;
}

// ============================================
// LOGIKA UTAMA (TYPING ENGINE)
// ============================================

/**
 * Paksa test baru (tanpa mode ulang)
 */
function forceNewTest() {
    isRepeatMode = false;
    lastTargetText = "";
    lastReplayData = [];
    renderNewTest();
}

/**
 * Menyisipkan karakter ekstra berdasarkan mode
 */
function injectExtraChars(text, mode) {
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
    let words = text.split(" ");

    return words.map(word => {
        const rand = Math.random();
        if (mode === "with-numbers" || mode === "numeric-challenge") {
            return rand > 0.6 ? word + numbers[Math.floor(Math.random() * numbers.length)] : word;
        }
        if (mode === "full" || mode === "symbol-challenge") {
            const chars = numbers + symbols;
            return rand > 0.5 ? word + chars[Math.floor(Math.random() * chars.length)] : word;
        }
        return word;
    }).join(" ");
}

/**
 * Render test baru
 */
function renderNewTest() {
    if (!appData.wordBank) return;

    clearInterval(timerInterval);
    if (ghostInterval) clearInterval(ghostInterval);

    const ghost = document.querySelector('.ghost-caret');
    if (ghost) ghost.style.display = 'none';

    const existingMsg = document.querySelector('.repeat-notification');
    if (existingMsg) existingMsg.remove();

    isStarted = false;
    currentIndex = 0;
    errors = 0;
    currentReplayData = [];

    const timerDisplay = document.getElementById('live-timer');
    timerDisplay.innerText = isTimerChallenge ? challengeTimeLimit + "s" : "0s";
    timerDisplay.classList.remove('timer-warning');

    document.getElementById('live-wpm').innerText = "0";
    document.getElementById('live-acc').innerText = "100%";

    const controlsContainer = document.getElementById('test-controls');
    if (controlsContainer) {
        if (isRepeatMode && lastTargetText) {
            controlsContainer.innerHTML = `
                <button onclick="repeatSameText()" class="btn-action btn-blue">🔁 Ulangi Kalimat</button>
                <button onclick="forceNewTest()" class="btn-action btn-primary">🚀 Ganti Kalimat</button>
            `;
        } else {
            controlsContainer.innerHTML = `
                <button onclick="renderNewTest()" class="btn-action btn-primary">
                   ${isChallengeMode ? '🎲 Acak Ulang Tantangan' : '🔄 Reset / Ganti Kalimat'}
                </button>
            `;
        }
    }

    if (isRepeatMode && lastTargetText) {
        targetText = lastTargetText;
    } else if (isChallengeMode && isChallengeMode === 'ghost') {
    } else {
        targetText = generateSentence();

        if (isNumericChallenge) {
            targetText = injectExtraChars(targetText, 'numeric-challenge');
        }
        if (isSymbolChallenge) {
            targetText = injectExtraChars(targetText, 'symbol-challenge');
        }

        if (isNoSpaceMode) {
            targetText = targetText.replace(/\s+/g, "");
        }

        lastTargetText = targetText;
    }

    const display = document.getElementById('text-display');
    display.innerHTML = "";

    if (isNoSpaceMode) display.classList.add('no-space-mode');
    else display.classList.remove('no-space-mode');

    targetText.split('').forEach((char, i) => {
        const span = document.createElement('span');
        span.innerText = char;
        span.className = 'char' + (i === 0 ? ' current' : '');
        display.appendChild(span);
    });

    if ((isRepeatMode && lastReplayData.length > 0) || (isChallengeMode === 'ghost')) {
        const repeatMsg = document.createElement('div');
        repeatMsg.className = 'repeat-notification';
        repeatMsg.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(59, 130, 246, 0.2);
            color: var(--accent);
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 0.8rem;
            border: 1px solid var(--accent);
            z-index: 10;
        `;
        repeatMsg.innerText = isChallengeMode === 'ghost' ? '👻 Ghost Race' : '🔁 Repeat Mode';
        display.appendChild(repeatMsg);
    }

    const inputEl = document.getElementById('typing-input');
    inputEl.value = "";
    inputEl.focus();
}

/**
 * Ulangi teks yang sama
 */
function repeatSameText() {
    if (!lastTargetText) return;

    isRepeatMode = true;
    renderNewTest();

    if (lastReplayData.length > 0) {
        setTimeout(() => {
            startGhost();
        }, 100);
    }
}

/**
 * Generate kalimat acak
 */
function generateSentence() {
    if (!appData.wordBank) return "Loading data...";

    const levelToUse = isChallengeMode ? challengeWordLevel : currentLevel;
    const diffConfig = appData.diffSettings[levelToUse];
    const complexity = diffConfig.complexity;
    const caseMode = document.getElementById('case-mode').value;

    const alphabetData = appData.wordBank[currentLang][complexity];
    let bank = [];

    if (alphabetData) {
        Object.values(alphabetData).forEach(wordList => {
            if (Array.isArray(wordList)) bank = bank.concat(wordList);
        });
    }

    if (bank.length === 0) return "Data kata kosong.";

    if (isExcludeMode && excludedChars !== "") {
        const forbiddenArray = excludedChars.toLowerCase().split('');
        bank = bank.filter(word => {
            const wStr = String(word).toLowerCase();
            return !forbiddenArray.some(badChar => wStr.includes(badChar));
        });

        if (bank.length < 5) {
            alert(`Terlalu sedikit kata tanpa huruf "${excludedChars.toUpperCase()}". Filter dibatalkan.`);
            cancelChallenge();
            return generateSentence();
        }
    }

    bank = shuffleArray(bank);

    // PERBAIKAN: Untuk TIME ATTACK, gunakan kata lebih sedikit tapi muncul bertahap
    let baseWordCount;
    if (isTimerChallenge) {
        // Time Attack: jumlah kata berdasarkan level
        baseWordCount = 15 + (challengeLevels[getChallengeKey()]?.['timer'] || 1) * 2;
        if (baseWordCount > 30) baseWordCount = 30;
    } else {
        baseWordCount = currentLength === 'short' ? 5 : (currentLength === 'long' ? 15 : 10);
    }

    let levelMultiplier = isChallengeMode ? (1 + (challengeLevels[getChallengeKey()]?.[getCurrentChallengeType()] || 1) * 0.1) : 1;
    let wordCount = Math.floor(baseWordCount * levelMultiplier);

    let selectedWords = bank.slice(0, wordCount);

    let processedWords = selectedWords.map(word => {
        let wStr = String(word);
        if (caseMode === "lowercase") return wStr.toLowerCase();
        if (caseMode === "uppercase") return wStr.toUpperCase();
        if (caseMode === "mixed") return Math.random() > 0.5 ? wStr.charAt(0).toUpperCase() + wStr.slice(1) : wStr.toLowerCase();
        return wStr;
    });

    return processedWords.join(" ").trim();
}

/**
 * Mendapatkan data tantangan saat ini
 */
function getCurrentChallengeData(challengeType, level = challengeWordLevel) {
    const key = `level-${level}`;
    return {
        level: challengeLevels[key]?.[challengeType] || 1,
        xp: challengeXP[key]?.[challengeType] || 0
    };
}

/**
 * Menyimpan data tantangan saat ini
 */
function setCurrentChallengeData(challengeType, newLevel, newXP, level = challengeWordLevel) {
    const key = `level-${level}`;

    if (!challengeLevels[key]) challengeLevels[key] = {};
    if (!challengeXP[key]) challengeXP[key] = {};

    challengeLevels[key][challengeType] = newLevel;
    challengeXP[key][challengeType] = newXP;

    localStorage.setItem('challengeLevelsByLevel', JSON.stringify(challengeLevels));
    localStorage.setItem('challengeXPByLevel', JSON.stringify(challengeXP));
}

// ============================================
// INPUT HANDLER
// ============================================

// Event listener untuk input typing
document.getElementById('typing-input').addEventListener('input', e => {
    if (!isStarted) {
        if (e.target.value.length === 0) return;

        isStarted = true;
        startTime = Date.now();

        timerInterval = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - startTime) / 1000);
            const timerEl = document.getElementById('live-timer');

            if (isTimerChallenge) {
                let timeLeft = challengeTimeLimit - elapsed;
                timerEl.innerText = timeLeft + "s";
                if (timeLeft <= 10) timerEl.classList.add('timer-warning');
                if (timeLeft <= 0) {
                    gameOverTimeUp();
                    return;
                }
            } else {
                timerEl.innerText = elapsed + "s";
            }

            const sec = elapsed || 1;
            const currentWpm = Math.round((currentIndex / 5) / (sec / 60));
            document.getElementById('live-wpm').innerText = currentWpm;
        }, 1000);

        if ((isRepeatMode || isChallengeMode === 'ghost') && lastReplayData.length > 0) {
            startGhost();
        }
    }

    if (isStarted && !isChallengeMode) {
        const currentTime = Date.now() - startTime;
        currentReplayData.push({
            index: currentIndex,
            time: currentTime
        });
    }

    const val = e.target.value;
    const lastCharTyped = val[val.length - 1];
    const spans = document.querySelectorAll('.char');

    if (val.length > currentIndex) {
        if (lastCharTyped === targetText[currentIndex]) {
            spans[currentIndex].className = 'char correct';
            currentIndex++;
            playSound('correct');
        }
        else {
            if (isSuddenDeath) {
                triggerSuddenDeathFailure();
                return;
            }
            spans[currentIndex].className = 'char incorrect';
            errors++;
            e.target.value = val.substring(0, currentIndex);
            playSound('error');
        }
    } else {
        currentIndex = val.length;
    }

    spans.forEach(s => s.classList.remove('current'));
    if (spans[currentIndex]) spans[currentIndex].classList.add('current');

    const totalTyped = currentIndex + errors;
    const acc = totalTyped === 0 ? 100 : Math.max(0, Math.round((currentIndex / totalTyped) * 100));
    document.getElementById('live-acc').innerText = acc + "%";

    if (currentIndex >= targetText.length) finishTest();
});

// ============================================
// FINISH & LOGIC
// ============================================

/**
 * Selesaikan test dan tampilkan hasil
 */
function finishTest() {
    clearInterval(timerInterval);
    const durationSeconds = Math.floor((new Date() - startTime) / 1000) || 1;
    const wpm = Math.round((targetText.length / 5) / (durationSeconds / 60));
    const acc = Math.max(0, Math.round(((targetText.length - errors) / targetText.length) * 100));

    let title = "Selesai!";
    let message = "Latihan selesai.";
    let isSuccess = true;
    const randomIdx = Math.floor(Math.random() * 5);
    const levelSettings = appData.diffSettings ? appData.diffSettings[currentLevel] : { minWpm: 0 };
    
    if (ghostInterval) {
        clearInterval(ghostInterval);
        ghostInterval = null;
    }

    // SELALU sukses - hapus semua kondisi gagal
    if (wpm > 60) { 
        title = "Luar Biasa!"; 
        message = typingFeedbacks.luarBiasa[randomIdx]; 
    } else { 
        title = "Bagus!"; 
        message = typingFeedbacks.bagus[randomIdx]; 
    }

    // Simpan ke database
    if (db) {
        const transaction = db.transaction(["scores"], "readwrite");
        transaction.objectStore("scores").add({
            wpm, accuracy: acc, level: currentLevel,
            language: currentLang, duration: durationSeconds,
            text: targetText, timestamp: Date.now(),
            mode: currentChallengeName || "Normal"
        });
    }

    // Handle XP untuk challenge mode
    if (isChallengeMode && currentChallengeName) {
        let challengeType = getCurrentChallengeType();

        if (!challengeType && currentChallengeName) {
            if (currentChallengeName.includes("Numeric")) challengeType = 'numeric';
            else if (currentChallengeName.includes("Symbol")) challengeType = 'symbol';
            else if (currentChallengeName.includes("Sudden")) challengeType = 'sudden';
            else if (currentChallengeName.includes("Forbidden")) challengeType = 'exclude';
            else if (currentChallengeName.includes("No Space")) challengeType = 'nospace';
            else if (currentChallengeName.includes("Ghost")) challengeType = 'ghost';
            else if (currentChallengeName.includes("Time Attack") || currentChallengeName.includes("Timer")) challengeType = 'timer';
        }

        console.log("XP Debug:", {
            isChallengeMode,
            currentChallengeName,
            challengeType,
            wpm,
            acc
        });

        if (challengeType && challengeType !== 'Normal') {
            const xpResult = addChallengeXP(challengeType, wpm, acc);

            if (xpResult && xpResult.xpGained > 0) {
                message += `\n\n+${xpResult.xpGained} XP (Total: ${xpResult.newXP} XP)`;

                if (xpResult.canLevelUp) {
                    message += `\n⭐ XP SUDAH CUKUP untuk naik level!`;
                    message += `\nButuh ${getWPMRequirement(challengeType, xpResult.currentLevel + 1)} WPM`;
                }
            }
        }
        
        message += "\n\nTantangan Selesai! 🎉";
        setTimeout(updateChallengeLock, 500);
    }

    const fullMessage = `${message}\nStatistik: ${wpm} WPM | Akurasi: ${acc}%`;
    showAlert(title, fullMessage, true);
}

// ============================================
// LOGIKA GHOST & REPEAT
// ============================================

/**
 * Ulangi test dengan data replay
 */
function repeatTest() {
    if (currentReplayData.length > 0) {
        lastReplayData = [...currentReplayData];
    }

    isRepeatMode = true;
    document.getElementById('custom-alert').style.display = 'none';

    setTimeout(() => {
        renderNewTest();

        if (lastReplayData.length > 0) {
            setTimeout(() => {
                startGhost();
            }, 100);
        }
    }, 100);
}

/**
 * Mulai ghost animation
 */
function startGhost() {
    if (ghostInterval) clearInterval(ghostInterval);
    if (lastReplayData.length === 0) return;

    const display = document.getElementById('text-display');
    let ghost = document.querySelector('.ghost-caret');

    if (!ghost) {
        ghost = document.createElement('div');
        ghost.className = 'ghost-caret';
        display.appendChild(ghost);
    }

    ghost.style.display = 'block';
    ghostPosition = 0;
    ghostStartTime = Date.now();

    ghostInterval = setInterval(() => {
        if (!isStarted || !display.children.length) return;

        const currentTime = Date.now() - ghostStartTime;
        const nextFrame = lastReplayData.find(frame => frame.time > currentTime);

        if (nextFrame && nextFrame.index < display.children.length) {
            const targetChar = display.children[nextFrame.index];
            if (targetChar) {
                const rect = targetChar.getBoundingClientRect();
                const displayRect = display.getBoundingClientRect();

                ghost.style.left = (rect.left - displayRect.left) + 'px';
                ghost.style.height = rect.height + 'px';
                ghostPosition = nextFrame.index;
            }
        } else if (currentTime > lastReplayData[lastReplayData.length - 1]?.time) {
            ghost.style.display = 'none';
        }
    }, 16);
}

// ============================================
// CHALLENGE MODES
// ============================================

/**
 * Update status lock tantangan
 */
function updateChallengeLock() {
    getHistory((history) => {
        if (history && history.length > 0) {
            maxWPM = Math.max(...history.map(h => h.wpm));
        } else {
            maxWPM = 0;
        }
        updateAllChallengeCards();
        updateChallengeWordLevelUI();
        updateUnlockedCount();
    });
}

/**
 * Tampilkan alert mulai tantangan
 */
function showChallengeStartAlert(challengeType, level, totalWPMReq, challengeName) {
    const modal = document.createElement('div');
    modal.id = 'challenge-start-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(10px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;

    const req = challengeRequirements[challengeType];
    const levelNames = ['Pemula', 'Mudah', 'Normal', 'Sulit', 'Legenda'];

    modal.innerHTML = `
        <div style="
            background: var(--card-bg);
            border: 2px solid ${req.color === 'mode-green' ? '#22c55e' :
            req.color === 'mode-orange' ? '#f59e0b' :
                req.color === 'mode-red' ? '#ef4444' :
                    req.color === 'mode-purple' ? '#8b5cf6' :
                        req.color === 'mode-blue' ? '#3b82f6' : '#a78bfa'};
            border-radius: 20px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            animation: slideUp 0.4s ease;
            position: relative;
        ">
            <button onclick="closeChallengeStartAlert()" style="
                position: absolute;
                top: 10px;
                right: 10px;
                background: transparent;
                border: none;
                color: #94a3b8;
                font-size: 20px;
                cursor: pointer;
                padding: 5px;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            " onmouseover="this.style.backgroundColor='rgba(255,255,255,0.1)'; this.style.color='#f8fafc'"
               onmouseout="this.style.backgroundColor='transparent'; this.style.color='#94a3b8'">
                ×
            </button>
            <div style="font-size: 48px; margin-bottom: 15px;">
                ${req.icon}
            </div>
            
            <h2 style="margin: 0 0 10px; color: ${req.color === 'mode-green' ? '#22c55e' :
            req.color === 'mode-orange' ? '#f59e0b' :
                req.color === 'mode-red' ? '#ef4444' :
                    req.color === 'mode-purple' ? '#8b5cf6' :
                        req.color === 'mode-blue' ? '#3b82f6' : '#a78bfa'};">
                ${challengeName}
            </h2>
            
            <div style="
                background: rgba(30, 41, 59, 0.7);
                border-radius: 12px;
                padding: 15px;
                margin: 20px 0;
                border: 1px solid #334155;
            ">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #94a3b8;">Level Tantangan</span>
                    <span style="font-weight: bold; color: #fbbf24;">${level} ${level === 6 ? '⭐' : '★'.repeat(Math.min(level, 5))}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #94a3b8;">Level Kata</span>
                    <span style="font-weight: bold; color: #60a5fa;">${levelNames[challengeWordLevel - 1]}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #94a3b8;">WPM Requirement</span>
                    <span style="font-weight: bold; color: ${maxWPM >= totalWPMReq ? '#22c55e' : '#ef4444'}">${totalWPMReq} WPM</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #94a3b8;">Rekor Anda</span>
                    <span style="font-weight: bold; color: ${maxWPM >= totalWPMReq ? '#22c55e' : '#ef4444'}">${maxWPM} WPM</span>
                </div>
            </div>
            
            ${challengeType === 'timer' ? `
            <div style="
                background: rgba(245, 158, 11, 0.1);
                border: 1px solid rgba(245, 158, 11, 0.3);
                border-radius: 10px;
                padding: 10px;
                margin: 15px 0;
            ">
                ⏱️ <strong>Time Attack:</strong> ${challengeTimeLimit} detik
            </div>
            ` : ''}
            
            ${challengeType === 'sudden' ? `
            <div style="
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.3);
                border-radius: 10px;
                padding: 10px;
                margin: 15px 0;
            ">
                💀 <strong>Sudden Death:</strong> Satu kesalahan = GAME OVER
            </div>
            ` : ''}
            
            ${challengeType === 'nospace' ? `
            <div style="
                background: rgba(59, 130, 246, 0.1);
                border: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 10px;
                padding: 10px;
                margin: 15px 0;
            ">
                🚧 <strong>No Space:</strong> Semua spasi dihapus
            </div>
            ` : ''}
            
            <div style="display: flex; gap: 15px; justify-content: center; margin-top: 25px;">
                <button onclick="closeChallengeStartAlert()" style="
                    background: transparent;
                    border: 1px solid #334155;
                    color: #94a3b8;
                    padding: 12px 25px;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: 0.2s;
                    flex: 1;
                " onmouseover="this.style.borderColor='#64748b'; this.style.color='#f8fafc'"
                   onmouseout="this.style.borderColor='#334155'; this.style.color='#94a3b8'">
                    Batal
                </button>
                <button onclick="startChallengeFromAlert('${challengeType}', ${level})" style="
                    background: ${req.color === 'mode-green' ? '#22c55e' :
            req.color === 'mode-orange' ? '#f59e0b' :
                req.color === 'mode-red' ? '#ef4444' :
                    req.color === 'mode-purple' ? '#8b5cf6' :
                        req.color === 'mode-blue' ? '#3b82f6' : '#a78bfa'};
                    border: none;
                    color: white;
                    padding: 12px 25px;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: 0.2s;
                    flex: 1;
                " onmouseover="this.style.opacity='0.9'"
                   onmouseout="this.style.opacity='1'">
                    🚀 Mulai Tantangan
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Tambahkan CSS untuk animasi
    if (!document.querySelector('#challenge-alert-styles')) {
        const style = document.createElement('style');
        style.id = 'challenge-alert-styles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    function handleModalKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            startChallengeFromAlert(challengeType, level);
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            closeChallengeStartAlert();
        }
    }

    function closeChallengeStartAlert() {
        closeModalElement('challenge-start-modal');
    }

    const enterHandler = () => startChallengeFromAlert(challengeType, level);
    const escapeHandler = () => closeChallengeStartAlert();
    addModalKeyHandler(modal, enterHandler, escapeHandler);

    document.addEventListener('keydown', handleModalKeydown);
    modal.handlerRef = handleModalKeydown;
}

/**
 * Menutup alert custom
 */
function closeChallengeStartAlert() {
    const modal = document.getElementById('challenge-start-modal');
    if (modal && modal.handlerRef) {
        document.removeEventListener('keydown', modal.handlerRef);
    }
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => modal.remove(), 300);
    }

    const style = document.querySelector('#fadeOut-style');
    if (style) style.remove();
}

/**
 * Helper untuk menambahkan event handler keyboard ke modal
 */
function addModalKeyHandler(modal, enterCallback, escapeCallback) {
    const handler = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (enterCallback) enterCallback();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            if (escapeCallback) escapeCallback();
        }
    };

    document.addEventListener('keydown', handler);
    modal._modalKeyHandler = handler;
    return handler;
}

/**
 * Helper untuk menghapus event handler keyboard dari modal
 */
function removeModalKeyHandler(modal) {
    if (modal && modal._modalKeyHandler) {
        document.removeEventListener('keydown', modal._modalKeyHandler);
        delete modal._modalKeyHandler;
    }
}

/**
 * Helper untuk menutup modal element
 */
function closeModalElement(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        removeModalKeyHandler(modal);
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (modal.parentNode) modal.parentNode.removeChild(modal);
        }, 300);
    }
}

/**
 * Tampilkan alert ketika requirement tidak terpenuhi
 */
function showChallengeAlert(type, level, totalWPMReq, userWPM, challengeWPMReq, wordLevelWPMReq) {
    const req = challengeRequirements[type];
    const levelNames = ['Pemula', 'Mudah', 'Normal', 'Sulit', 'Legenda'];

    const modal = document.createElement('div');
    modal.id = 'challenge-requirement-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(10px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;

    modal.innerHTML = `
        <div style="
            background: var(--card-bg);
            border: 2px solid #ef4444;
            border-radius: 20px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            animation: slideUp 0.4s ease;
        ">
            <div style="font-size: 48px; margin-bottom: 15px; color: #ef4444;">
                ⚠️
            </div>
            
            <h2 style="margin: 0 0 15px; color: #ef4444;">
                Belum Memenuhi Requirement!
            </h2>
            
            <div style="
                background: rgba(30, 41, 59, 0.7);
                border-radius: 12px;
                padding: 20px;
                margin: 20px 0;
                border: 1px solid #334155;
                text-align: left;
            ">
                <div style="margin-bottom: 10px; color: #94a3b8;">
                    <strong>Detail Requirement:</strong>
                </div>
                
                ${challengeWPMReq > wordLevelWPMReq ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 8px; background: rgba(239, 68, 68, 0.1); border-radius: 6px;">
                    <span>Level Tantangan ${level}</span>
                    <span style="font-weight: bold; color: #ef4444;">${challengeWPMReq} WPM</span>
                </div>
                ` : ''}
                
                ${wordLevelWPMReq > challengeWPMReq ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 8px; background: rgba(239, 68, 68, 0.1); border-radius: 6px;">
                    <span>Level Kata ${levelNames[challengeWordLevel - 1]}</span>
                    <span style="font-weight: bold; color: #ef4444;">${wordLevelWPMReq} WPM</span>
                </div>
                ` : ''}
                
                ${challengeWPMReq === wordLevelWPMReq ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 8px; background: rgba(239, 68, 68, 0.1); border-radius: 6px;">
                    <span>Kedua Requirement Sama</span>
                    <span style="font-weight: bold; color: #ef4444;">${challengeWPMReq} WPM</span>
                </div>
                ` : ''}
                
                <div style="display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 1px solid #334155;">
                    <span style="font-weight: bold;">Total Requirement</span>
                    <span style="font-weight: bold; color: #ef4444; font-size: 1.1rem;">${totalWPMReq} WPM</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-top: 10px;">
                    <span>Rekor Anda</span>
                    <span style="font-weight: bold; color: ${userWPM >= totalWPMReq ? '#22c55e' : '#ef4444'}">${userWPM} WPM</span>
                </div>
                
                <div style="margin-top: 15px; padding: 10px; background: rgba(251, 191, 36, 0.1); border-radius: 6px; border: 1px solid rgba(251, 191, 36, 0.3);">
                    <div style="color: #fbbf24; font-weight: bold; margin-bottom: 5px;">Kurang: ${totalWPMReq - userWPM} WPM</div>
                    <div style="font-size: 0.9rem; color: #94a3b8;">Latihan lagi untuk meningkatkan rekor WPM!</div>
                </div>
            </div>
            
            <div style="display: flex; gap: 15px; justify-content: center; margin-top: 20px;">
                <button onclick="closeChallengeAlert()" style="
                    background: transparent;
                    border: 1px solid #334155;
                    color: #94a3b8;
                    padding: 12px 25px;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: 0.2s;
                    flex: 1;
                " onmouseover="this.style.borderColor='#64748b'; this.style.color='#f8fafc'"
                   onmouseout="this.style.borderColor='#334155'; this.style.color='#94a3b8'">
                    Tutup
                </button>
                <button onclick="showLowerLevelChallenge('${type}', ${level})" style="
                    background: #3b82f6;
                    border: none;
                    color: white;
                    padding: 12px 25px;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: 0.2s;
                    flex: 1;
                " onmouseover="this.style.opacity='0.9'"
                   onmouseout="this.style.opacity='1'">
                    🔽 Coba Level Lebih Rendah
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

/**
 * Menutup alert requirement
 */
function closeChallengeAlert() {
    const modal = document.getElementById('challenge-requirement-modal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => modal.remove(), 300);
    }
}

/**
 * Tampilkan opsi untuk mencoba level yang lebih rendah
 */
function showLowerLevelChallenge(type, currentLevel) {
    closeChallengeAlert();

    // Cari level tertinggi yang bisa dimainkan
    let playableLevel = 1;
    for (let i = currentLevel - 1; i >= 1; i--) {
        const challengeWPMReq = getWPMRequirement(type, i);
        const wordLevelWPMReq = getWordLevelWPMRequirement(challengeWordLevel);
        const totalWPMReq = Math.max(challengeWPMReq, wordLevelWPMReq);

        if (maxWPM >= totalWPMReq) {
            playableLevel = i;
            break;
        }
    }

    // Tampilkan alert untuk level yang bisa dimainkan
    setTimeout(() => {
        if (playableLevel < currentLevel) {
            const confirmPlay = confirm(`Coba Level ${playableLevel}? Requirement: ${getWPMRequirement(type, playableLevel)} WPM\n\nRekor Anda: ${maxWPM} WPM`);
            if (confirmPlay) {
                // Set level tantangan ke yang bisa dimainkan
                challengeLevels[type] = playableLevel;
                localStorage.setItem('challengeLevels', JSON.stringify(challengeLevels));

                // Panggil handleChallengeClick dengan level baru
                handleChallengeClick(type);
            }
        } else {
            alert("Maaf, Anda belum bisa memainkan level manapun dari tantangan ini.\n\nCoba tingkatkan rekor WPM Anda terlebih dahulu!");
        }
    }, 300);
}

/**
 * Tampilkan prompt untuk forbidden letters
 */
function showForbiddenLettersPrompt(type, level, challengeName) {
    const modal = document.createElement('div');
    modal.id = 'forbidden-letters-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(10px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;

    modal.innerHTML = `
        <div style="
            background: var(--card-bg);
            border: 2px solid #8b5cf6;
            border-radius: 20px;
            padding: 25px 30px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            animation: slideUp 0.4s ease;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        ">
            <div style="font-size: 48px; margin-bottom: 10px; color: #8b5cf6;">
                🚫
            </div>
            
            <h2 style="margin: 0 0 5px; color: #8b5cf6; font-size: 1.5rem;">
                ${challengeName}
            </h2>
            
            <p style="color: #94a3b8; margin-bottom: 20px; font-size: 0.9rem; line-height: 1.4;">
                Masukkan huruf yang <strong style="color: #f1f5f9;">dilarang</strong> untuk tantangan ini.
                Kata-kata yang mengandung huruf ini akan dihilangkan.
            </p>
            
            <div style="
                background: rgba(30, 41, 59, 0.7);
                border-radius: 12px;
                padding: 15px;
                margin: 15px 0;
                border: 1px solid #334155;
                text-align: left;
            ">
                <div style="color: #a78bfa; font-weight: bold; margin-bottom: 8px; font-size: 0.9rem;">
                    <span style="margin-right: 5px;">📌</span> Contoh:
                </div>
                <div style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.5;">
                    • <span style="color: #fbbf24;">"a"</span> → semua kata dengan huruf 'a' dihilangkan<br>
                    • <span style="color: #fbbf24;">"aei"</span> → hilangkan kata dengan 'a', 'e', atau 'i'<br>
                    • <span style="color: #fbbf24;">"xyz"</span> → tantangan sangat sulit!
                </div>
            </div>
            
            <div style="margin: 20px 0;">
                <div style="
                    text-align: center;
                    margin-bottom: 8px;
                    color: #cbd5e1;
                    font-weight: 600;
                    font-size: 0.95rem;
                ">
                    Masukkan huruf yang dilarang:
                </div>
                
                <input type="text" id="forbidden-input" 
                    placeholder="contoh: aeiou" 
                    style="
                        width: 100%;
                        padding: 12px 16px;
                        background: rgba(30, 41, 59, 0.9);
                        border: 2px solid #8b5cf6;
                        border-radius: 10px;
                        color: #f1f5f9;
                        font-size: 1.1rem;
                        text-align: center;
                        text-transform: lowercase;
                        letter-spacing: 1px;
                        outline: none;
                        transition: all 0.2s;
                        font-family: 'Segoe UI', system-ui, sans-serif;
                    " 
                    onfocus="this.style.borderColor='#a78bfa'; this.style.boxShadow='0 0 0 3px rgba(139, 92, 246, 0.2)'"
                    onblur="this.style.borderColor='#8b5cf6'; this.style.boxShadow='none'"
                    oninput="this.value = this.value.toLowerCase().replace(/[^a-z]/g, '')">
                
                <div style="
                    margin-top: 8px;
                    font-size: 0.8rem;
                    color: #64748b;
                    text-align: center;
                    font-style: italic;
                ">
                    Masukkan hanya huruf (a-z), tanpa spasi atau karakter lain.
                </div>
            </div>
            
            <div style="display: flex; gap: 12px; justify-content: center; margin-top: 20px;">
                <button onclick="closeForbiddenLettersModal()" style="
                    background: transparent;
                    border: 1px solid #475569;
                    color: #94a3b8;
                    padding: 12px 24px;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    flex: 1;
                    font-size: 0.95rem;
                " onmouseover="this.style.borderColor='#64748b'; this.style.color='#f8fafc'; this.style.background='rgba(100, 116, 139, 0.1)'"
                   onmouseout="this.style.borderColor='#475569'; this.style.color='#94a3b8'; this.style.background='transparent'">
                    Batal
                </button>
                <button onclick="submitForbiddenLetters('${type}', ${level}, '${challengeName}')" style="
                    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                    border: none;
                    color: white;
                    padding: 12px 24px;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    flex: 1;
                    font-size: 0.95rem;
                    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
                " onmouseover="this.style.opacity='0.9'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 16px rgba(139, 92, 246, 0.4)'"
                   onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(139, 92, 246, 0.3)'">
                    🚀 Konfirmasi
                </button>
            </div>
            
            <div style="
                margin-top: 15px;
                padding: 8px 12px;
                background: rgba(139, 92, 246, 0.1);
                border-radius: 6px;
                border-left: 3px solid #8b5cf6;
                font-size: 0.8rem;
                color: #a78bfa;
                text-align: left;
            ">
                <span style="margin-right: 5px;">💡</span>
                <strong>Tips:</strong> Mulai dengan 1-2 huruf terlebih dahulu untuk mencoba tantangan ini.
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const enterHandler = () => submitForbiddenLetters(type, level, challengeName);
    const escapeHandler = () => closeForbiddenLettersModal();
    addModalKeyHandler(modal, enterHandler, escapeHandler);

    setTimeout(() => {
        const input = document.getElementById('forbidden-input');
        if (input) {
            input.focus();
            input.select();
        }
    }, 100);

    if (!document.querySelector('#forbidden-animations')) {
        const style = document.createElement('style');
        style.id = 'forbidden-animations';
        style.textContent = `
            @keyframes fadeIn { 
                from { opacity: 0; } 
                to { opacity: 1; } 
            }
            @keyframes slideUp { 
                from { transform: translateY(30px); opacity: 0; } 
                to { transform: translateY(0); opacity: 1; } 
            }
            @keyframes fadeOut { 
                from { opacity: 1; } 
                to { opacity: 0; } 
            }
            
            @keyframes pulsePlaceholder {
                0%, 100% { opacity: 0.7; }
                50% { opacity: 1; }
            }
            
            #forbidden-input::placeholder {
                color: #64748b;
                animation: pulsePlaceholder 2s infinite;
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Menutup modal forbidden letters
 */
function closeForbiddenLettersModal() {
    const modal = document.getElementById('forbidden-letters-modal');
    if (modal && modal.dataset.enterHandler) {
        document.removeEventListener('keydown', modal.dataset.enterHandler);
    }
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => modal.remove(), 300);
    }
}

/**
 * Mulai tantangan dari alert
 */
function startChallengeFromAlert(challengeType, level) {
    closeChallengeStartAlert();

    isChallengeMode = true;
    currentChallengeName = getChallengeDisplayName(challengeType, level);

    document.getElementById('active-challenge-panel').classList.add('active');
    document.getElementById('active-challenge-btn').style.display = 'block';

    updateChallengeUI();

    showPage('typing-page');

    setTimeout(() => {
        renderNewTest();
    }, 300);
}

/**
 * Handle klik pada kartu tantangan
 */
function handleChallengeClick(type) {
    console.log(`handleChallengeClick: ${type}`, {
        maxWPM: maxWPM,
        unlockWPM: challengeRequirements[type].unlockWPM,
        challengeWordLevel: challengeWordLevel
    });

    const req = challengeRequirements[type];
    if (!req) {
        console.error('No requirements for challenge type:', type);
        return;
    }

    // CEK UNLOCK
    if (maxWPM < req.unlockWPM) {
        showErrorAlert(`Mode terkunci! Butuh rekor ${req.unlockWPM} WPM untuk unlock.\n\nRekor Anda: ${maxWPM} WPM`);
        return;
    }

    // KHUSUS UNTUK GHOST
    if (type === 'ghost') {
        startGhostRace();
        return;
    }

    const currentData = getCurrentChallengeData(type);
    const level = currentData.level;
    const challengeWPMReq = getWPMRequirement(type, level);
    const wordLevelWPMReq = getWordLevelWPMRequirement(challengeWordLevel);
    const totalWPMReq = Math.max(challengeWPMReq, wordLevelWPMReq);

    console.log(`Requirements check:`, {
        type: type,
        level: level,
        challengeWPMReq: challengeWPMReq,
        wordLevelWPMReq: wordLevelWPMReq,
        totalWPMReq: totalWPMReq,
        maxWPM: maxWPM
    });

    if (maxWPM < totalWPMReq) {
        showChallengeAlert(type, level, totalWPMReq, maxWPM, challengeWPMReq, wordLevelWPMReq);
        return;
    }

    cancelChallenge();
    setActiveChallengeInfo(type, level);

    currentLevel = challengeWordLevel;
    document.getElementById('level-selector').value = challengeWordLevel;

    document.getElementById('active-challenge-panel').classList.add('active');
    document.getElementById('active-challenge-btn').style.display = 'block';

    let challengeName = getChallengeDisplayName(type, level);

    // Set challenge berdasarkan type
    if (type === 'numeric') {
        isNumericChallenge = true;
        currentChallengeName = challengeName;
    } else if (type === 'symbol') {
        isSymbolChallenge = true;
        currentChallengeName = challengeName;
    } else if (type === 'sudden') {
        isSuddenDeath = true;
        currentChallengeName = challengeName;
    } else if (type === 'exclude') {
        showForbiddenLettersPrompt(type, level, challengeName);
        return;
    } else if (type === 'nospace') {
        isNoSpaceMode = true;
        currentChallengeName = challengeName;
    } else if (type === 'timer') {
        isTimerChallenge = true;
        challengeTimeLimit = 30 - (level * 2);
        if (challengeTimeLimit < 15) challengeTimeLimit = 15;
        currentChallengeName = challengeName;
        currentLength = 'long';
    }

    isChallengeMode = true;
    updateChallengeUI();

    showChallengeStartAlert(type, level, totalWPMReq, challengeName);
}

/**
 * Submit forbidden letters
 */
function submitForbiddenLetters(type, level, challengeName) {
    const input = document.getElementById('forbidden-input');
    if (!input || !input.value.trim()) {
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
        input.style.animation = 'shake 0.5s ease';
        
        if (!document.querySelector('#shake-animation')) {
            const style = document.createElement('style');
            style.id = 'shake-animation';
            style.textContent = `
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        setTimeout(() => {
            input.style.animation = '';
            input.focus();
        }, 500);
        
        showErrorAlert("Harap masukkan huruf yang dilarang!");
        return;
    }

    const forbiddenChars = input.value.toLowerCase().replace(/\s/g, "");

    if (forbiddenChars.length === 0) {
        showErrorAlert("Harap masukkan minimal satu huruf!");
        return;
    }

    if (forbiddenChars.length > 10) {
        showErrorAlert("Maksimal 10 huruf yang dilarang!");
        return;
    }

    const vowels = ['a', 'e', 'i', 'o', 'u'];
    const allVowels = vowels.every(v => forbiddenChars.includes(v));

    if (allVowels && forbiddenChars.length >= 5) {
        const confirmModal = document.createElement('div');
        confirmModal.id = 'vowel-warning-modal';
        confirmModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(15, 23, 42, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
        `;
        
        confirmModal.innerHTML = `
            <div style="
                background: var(--card-bg);
                border: 2px solid #f59e0b;
                border-radius: 15px;
                padding: 25px;
                max-width: 450px;
                width: 90%;
                text-align: center;
            ">
                <div style="font-size: 48px; color: #f59e0b; margin-bottom: 15px;">⚠️</div>
                <h3 style="color: #f59e0b; margin: 0 0 10px;">PERINGATAN!</h3>
                <p style="color: #cbd5e1; margin-bottom: 15px; line-height: 1.5;">
                    Anda melarang semua huruf vokal: <strong style="color: #fbbf24">${forbiddenChars.toUpperCase()}</strong><br>
                    Ini akan membuat tantangan <strong>SANGAT SULIT</strong>!
                </p>
                <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 20px;">
                    Hampir semua kata dalam Bahasa Indonesia mengandung huruf vokal.
                </p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="document.getElementById('vowel-warning-modal').remove()" style="
                        background: transparent;
                        border: 1px solid #475569;
                        color: #94a3b8;
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        flex: 1;
                    ">Ubah Huruf</button>
                    <button onclick="
                        document.getElementById('vowel-warning-modal').remove();
                        proceedWithForbiddenLetters('${type}', ${level}, '${challengeName}', '${forbiddenChars}');
                    " style="
                        background: #f59e0b;
                        border: none;
                        color: white;
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        flex: 1;
                    ">Lanjutkan</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(confirmModal);
        return;
    }

    proceedWithForbiddenLetters(type, level, challengeName, forbiddenChars);
}

/**
 * Lanjutkan dengan forbidden letters
 */
function proceedWithForbiddenLetters(type, level, challengeName, forbiddenChars) {
    closeForbiddenLettersModal();
    
    const loadingNotification = document.createElement('div');
    loadingNotification.id = 'loading-notification';
    loadingNotification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #8b5cf6;
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 10001;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    loadingNotification.innerHTML = `
        <span style="font-size: 20px;">⏳</span>
        <span>Mempersiapkan tantangan...</span>
    `;
    
    document.body.appendChild(loadingNotification);

    excludedChars = forbiddenChars;
    isExcludeMode = true;
    currentChallengeName = `${challengeName} (Forbidden: ${excludedChars.toUpperCase()})`;

    currentLevel = challengeWordLevel;
    document.getElementById('level-selector').value = challengeWordLevel;

    isChallengeMode = true;

    document.getElementById('active-challenge-panel').classList.add('active');
    document.getElementById('active-challenge-btn').style.display = 'block';

    updateChallengeUI();

    setTimeout(() => {
        if (loadingNotification.parentNode) {
            loadingNotification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => loadingNotification.remove(), 300);
        }
    }, 1000);

    showPage('typing-page');

    setTimeout(() => {
        renderNewTest();
    }, 500);
}

/**
 * Tampilkan error alert custom
 */
function showErrorAlert(message) {
    const existingAlert = document.getElementById('error-alert');
    if (existingAlert) existingAlert.remove();

    const alert = document.createElement('div');
    alert.id = 'error-alert';
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(239, 68, 68, 0.9);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 10001;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        border-left: 4px solid #dc2626;
        max-width: 300px;
    `;

    alert.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 20px;">⚠️</span>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(alert);

    setTimeout(() => {
        alert.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}

/**
 * Set info tantangan aktif
 */
function setActiveChallengeInfo(type, level) {
    const req = challengeRequirements[type];
    if (!req) return;

    const challengeNames = {
        'numeric': 'Numeric Master',
        'symbol': 'Symbolic Pro',
        'sudden': 'Sudden Death',
        'exclude': 'Forbidden Letters',
        'nospace': 'No Space Zone',
        'ghost': 'Ghost Race',
        'timer': 'Time Attack'
    };

    const levelNames = ['Pemula', 'Mudah', 'Normal', 'Sulit', 'Legenda'];

    const challengeWPMReq = getWPMRequirement(type, level);
    const wordLevelWPMReq = getWordLevelWPMRequirement(challengeWordLevel);
    const totalWPMReq = Math.max(challengeWPMReq, wordLevelWPMReq);

    document.getElementById('active-challenge-icon').textContent = req.icon;
    document.getElementById('active-challenge-name').textContent = `${challengeNames[type]} - Level ${level}`;
    document.getElementById('active-challenge-mode').textContent = challengeNames[type];
    document.getElementById('active-challenge-difficulty').textContent = `Level ${level} (${req.difficulty})`;
    document.getElementById('active-word-level').textContent = levelNames[challengeWordLevel - 1];
    document.getElementById('active-wpm-req').textContent = `${totalWPMReq} WPM`;
    document.getElementById('active-user-record').textContent = `${maxWPM} WPM`;

    setTimeout(() => {
        const currentData = getCurrentChallengeData(type);
        const canLevelUp = checkIfCanLevelUp(type, currentData.xp, currentData.level);

        if (canLevelUp) {
            const nextLevel = currentData.level + 1;
            const wpmNeeded = getWPMRequirement(type, nextLevel);
            updateLevelUpBadgeInTypingPage(type, true, nextLevel, wpmNeeded);
        }
    }, 300);
}

/**
 * Tampilkan info tantangan aktif
 */
function showActiveChallengeInfo() {
    const panel = document.getElementById('active-challenge-panel');
    panel.classList.toggle('active');
}

/**
 * Mulai ghost race
 */
function startGhostRace() {
    console.log('startGhostRace called');

    const req = challengeRequirements['ghost'];
    if (maxWPM < req.unlockWPM) {
        showErrorAlert(`Mode terkunci! Butuh rekor ${req.unlockWPM} WPM untuk unlock.\n\nRekor Anda: ${maxWPM} WPM`);
        return;
    }

    getHistory((history) => {
        console.log('History loaded:', history?.length, 'records');

        if (!history || history.length === 0) {
            createAIForGhostRace();
            return;
        }

        const normalHistory = history.filter(h => !h.mode || h.mode === 'Normal');

        if (normalHistory.length === 0) {
            createAIForGhostRace();
            return;
        }

        cancelChallenge();

        const currentData = getCurrentChallengeData('ghost');
        const challengeLevel = currentData.level;

        let targetWPM;
        if (challengeLevel <= 1) {
            targetWPM = maxWPM * 0.8;
        } else if (challengeLevel <= 5) {
            const progress = (challengeLevel - 1) / 4;
            targetWPM = maxWPM * (0.8 + (progress * 0.3));
        } else {
            targetWPM = maxWPM * 1.1;
        }

        targetWPM = Math.round(Math.max(20, Math.min(150, targetWPM)));

        const topRecord = normalHistory.reduce((p, c) => (p.wpm > c.wpm ? p : c), normalHistory[0]);
        targetText = topRecord?.text || generateSentence();
        lastTargetText = targetText;

        isChallengeMode = true;
        currentChallengeName = `Ghost Race - Level ${challengeLevel}`;

        currentLevel = challengeWordLevel;
        document.getElementById('level-selector').value = challengeWordLevel;

        const totalChars = targetText.length;
        const totalTime = (totalChars / 5) * (60 / targetWPM) * 1000;
        const timePerChar = totalTime / totalChars;

        lastReplayData = [];
        for (let i = 0; i < totalChars; i++) {
            const randomness = Math.random() * 0.3 - 0.15;
            lastReplayData.push({
                index: i,
                time: i * timePerChar * (1 + randomness)
            });
        }

        setActiveChallengeInfo('ghost', challengeLevel);
        showGhostRaceAlert(targetWPM, challengeLevel);
    });
}

/**
 * Buat AI untuk ghost race
 */
function createAIForGhostRace() {
    cancelChallenge();

    const currentData = getCurrentChallengeData('ghost');
    const challengeLevel = currentData.level;

    let aiWPM;
    if (maxWPM === 0) {
        aiWPM = 30 + (challengeLevel * 5);
    } else {
        if (challengeLevel <= 1) {
            aiWPM = maxWPM * 0.8;
        } else if (challengeLevel <= 5) {
            const progress = (challengeLevel - 1) / 4;
            aiWPM = maxWPM * (0.8 + (progress * 0.3));
        } else {
            aiWPM = maxWPM * 1.1;
        }
    }

    aiWPM = Math.round(Math.max(20, Math.min(150, aiWPM)));

    targetText = generateSentence();
    lastTargetText = targetText;

    isChallengeMode = true;
    currentChallengeName = `Ghost Race AI - Level ${challengeLevel}`;

    const totalChars = targetText.length;
    const totalTime = (totalChars / 5) * (60 / aiWPM) * 1000;
    const timePerChar = totalTime / totalChars;

    lastReplayData = [];
    for (let i = 0; i < totalChars; i++) {
        lastReplayData.push({
            index: i,
            time: i * timePerChar
        });
    }

    setActiveChallengeInfo('ghost', challengeLevel);
    showGhostRaceAlert(aiWPM, challengeLevel, true);
}

/**
 * Tampilkan alert ghost race
 */
function showGhostRaceAlert(ghostWPM, ghostAccuracy = 95) {
    const existingModal = document.getElementById('ghost-race-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'ghost-race-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(10px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;

    const levelNames = ['Pemula', 'Mudah', 'Normal', 'Sulit', 'Legenda'];
    const wordLevelName = levelNames[challengeWordLevel - 1] || 'Pemula';

    modal.innerHTML = `
        <div style="
            background: var(--card-bg);
            border: 2px solid #a78bfa;
            border-radius: 20px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            animation: slideUp 0.4s ease;
        ">
            <div style="font-size: 48px; margin-bottom: 15px;">
                👻
            </div>
            
            <h2 style="margin: 0 0 10px; color: #a78bfa;">
                GHOST RACE CHALLENGE
            </h2>
            
            <p style="color: #94a3b8; margin-bottom: 25px;">
                Lawan rekor tertinggimu sendiri!
            </p>
            
            <div style="
                background: rgba(30, 41, 59, 0.7);
                border-radius: 12px;
                padding: 20px;
                margin: 20px 0;
                border: 1px solid #334155;
            ">
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #334155;">
                    <span style="color: #94a3b8;">Target WPM</span>
                    <span style="font-size: 1.5rem; font-weight: bold; color: #a78bfa;">${ghostWPM} WPM</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: #94a3b8;">Target Akurasi</span>
                    <span style="font-weight: bold; color: #fbbf24;">${ghostAccuracy}%</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: #94a3b8;">Level Kata</span>
                    <span style="font-weight: bold; color: #60a5fa;">${wordLevelName}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #94a3b8;">Panjang Teks</span>
                    <span style="font-weight: bold; color: #94a3b8;">${targetText.split(' ').length} kata</span>
                </div>
            </div>
            
            <div style="
                background: rgba(167, 139, 250, 0.1);
                border: 1px solid rgba(167, 139, 250, 0.3);
                border-radius: 10px;
                padding: 15px;
                margin: 20px 0;
            ">
                <div style="color: #a78bfa; font-weight: bold; margin-bottom: 5px;">🎯 TANTANGAN</div>
                <div style="font-size: 0.95rem; color: #94a3b8;">
                    Kalahkan hantu dengan WPM lebih tinggi dari <strong>${ghostWPM} WPM</strong> dan akurasi minimal <strong>${Math.max(ghostAccuracy - 5, 85)}%</strong>!
                </div>
            </div>
            
            <div style="display: flex; gap: 15px; justify-content: center; margin-top: 20px;">
                <button id="ghost-race-cancel" style="
                    background: transparent;
                    border: 1px solid #334155;
                    color: #94a3b8;
                    padding: 12px 25px;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: 0.2s;
                    flex: 1;
                " onmouseover="this.style.borderColor='#64748b'; this.style.color='#f8fafc'"
                   onmouseout="this.style.borderColor='#334155'; this.style.color='#94a3b8'">
                    Batal
                </button>
                <button id="ghost-race-start" style="
                    background: #a78bfa;
                    border: none;
                    color: white;
                    padding: 12px 25px;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: 0.2s;
                    flex: 1;
                " onmouseover="this.style.opacity='0.9'"
                   onmouseout="this.style.opacity='1'">
                    👻 Mulai Race!
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const startRace = () => {
        closeGhostRaceAlert();
        startGhostRaceFromAlert();
    };

    const cancelRace = () => {
        closeGhostRaceAlert();
        cancelChallenge();
    };

    addModalKeyHandler(modal, startRace, cancelRace);

    setTimeout(() => {
        document.getElementById('ghost-race-cancel').addEventListener('click', cancelRace);
        document.getElementById('ghost-race-start').addEventListener('click', startRace);
    }, 100);

    if (!document.querySelector('#ghost-animations')) {
        const style = document.createElement('style');
        style.id = 'ghost-animations';
        style.textContent = `
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Menutup alert ghost race
 */
function closeGhostRaceAlert() {
    closeModalElement('ghost-race-modal');
}

/**
 * Mulai ghost race dari alert
 */
function startGhostRaceFromAlert() {
    console.log('Starting Ghost Race from alert...');

    document.getElementById('active-challenge-panel').classList.add('active');
    document.getElementById('active-challenge-btn').style.display = 'block';

    isChallengeMode = true;
    updateChallengeUI();

    showPage('typing-page');

    setTimeout(() => {
        renderNewTest();

        setTimeout(() => {
            if (lastReplayData.length > 0) {
                startGhost();
                console.log('Ghost started with', lastReplayData.length, 'frames');
            }
        }, 200);
    }, 100);
}

/**
 * Trigger failure pada sudden death
 */
function triggerSuddenDeathFailure() {
    clearInterval(timerInterval);
    isStarted = false;
    showAlert("ELIMINASI! 💀", "Satu kesalahan = Game Over.", false);
}

/**
 * Game over karena waktu habis
 */
function gameOverTimeUp() {
    clearInterval(timerInterval);
    isStarted = false;
    showAlert("WAKTU HABIS! ⏰", "Gagal menyelesaikan tepat waktu.", false);
}

/**
 * Update UI tantangan
 */
function updateChallengeUI() {
    const container = document.getElementById('active-challenge-display');
    if (!container) return;

    if (isChallengeMode) {
        document.getElementById('length-selector').disabled = true;

        const challengeTag = document.createElement('div');
        challengeTag.className = `active-challenge-tag ${isSuddenDeath ? 'danger' : ''}`;
        challengeTag.innerHTML = `
            <span>Mode: ${currentChallengeName}</span>
            <button class="btn-remove-challenge" onclick="cancelChallenge()" title="Batalkan">✕</button>
        `;

        container.innerHTML = '';
        container.appendChild(challengeTag);

        const challengeType = getCurrentChallengeType();
        if (challengeType) {
            const currentData = getCurrentChallengeData(challengeType);
            const canLevelUp = checkIfCanLevelUp(challengeType, currentData.xp, currentData.level);

            if (canLevelUp) {
                const nextLevel = currentData.level + 1;
                const wpmNeeded = getWPMRequirement(challengeType, nextLevel);
                updateLevelUpBadgeInTypingPage(challengeType, true, nextLevel, wpmNeeded);
                challengeTag.classList.add('with-level-up');
            }
        }
    } else {
        document.getElementById('length-selector').disabled = false;
        container.innerHTML = "";
    }
}

/**
 * Batalkan tantangan
 */
function cancelChallenge() {
    isSuddenDeath = false;
    isNoSpaceMode = false;
    isExcludeMode = false;
    isTimerChallenge = false;
    isChallengeMode = false;
    isNumericChallenge = false;
    isSymbolChallenge = false;
    excludedChars = "";
    currentChallengeName = null;
    isRepeatMode = false;

    const selector = document.getElementById('level-selector');
    if (selector) {
        currentLevel = parseInt(selector.value);
    }

    ['challenge-start-modal', 'challenge-requirement-modal',
        'forbidden-letters-modal', 'ghost-race-modal'].forEach(id => {
            const modal = document.getElementById(id);
            if (modal && modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        });

    document.getElementById('active-challenge-panel').classList.remove('active');
    document.getElementById('active-challenge-btn').style.display = 'none';

    updateChallengeUI();
    updateChallengeWordLevelUI();
    renderNewTest();

    setTimeout(() => {
        checkAndShowLevelUpButtons();
    }, 100);
}

/**
 * Mendapatkan tipe tantangan saat ini
 */
function getCurrentChallengeType() {
    if (isNumericChallenge) return 'numeric';
    if (isSymbolChallenge) return 'symbol';
    if (isSuddenDeath) return 'sudden';
    if (isExcludeMode) return 'exclude';
    if (isNoSpaceMode) return 'nospace';
    if (isChallengeMode === 'ghost') return 'ghost';
    if (isTimerChallenge) return 'timer';
    return null;
}

/**
 * Cek dan tampilkan level up di halaman typing
 */
function checkAndShowTypingPageLevelUp() {
    if (!isChallengeMode || !currentChallengeName) return;

    const challengeType = getCurrentChallengeType();
    if (!challengeType) return;

    const currentData = getCurrentChallengeData(challengeType);
    const canLevelUp = checkIfCanLevelUp(challengeType, currentData.xp, currentData.level);

    if (canLevelUp) {
        const nextLevel = currentData.level + 1;
        const wpmNeeded = getWPMRequirement(challengeType, nextLevel);
        updateLevelUpBadgeInTypingPage(challengeType, true, nextLevel, wpmNeeded);
    }
}

/**
 * Tampilkan halaman tertentu
 */
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const page = document.getElementById(id);
    if (page) page.classList.add('active');

    if (id === 'dashboard-page') {
        document.getElementById('nav-dashboard').classList.add('active');
        refreshDashboard();
    } else if (id === 'challenges-page') {
        document.getElementById('nav-challenges').classList.add('active');
        setTimeout(refreshAllUI, 100);
    } else {
        document.getElementById('nav-typing').classList.add('active');

        setTimeout(() => {
            const input = document.getElementById('typing-input');
            if (input) input.focus();
        }, 100);

        setTimeout(checkAndShowTypingPageLevelUp, 100);
    }
}

// ============================================
// DASHBOARD FUNCTIONS
// ============================================

/**
 * Refresh dashboard data
 */
function refreshDashboard() {
    if (!db) return;
    const store = db.transaction("scores", "readonly").objectStore("scores");
    store.getAll().onsuccess = e => {
        let allData = e.target.result;
        const langFilter = document.getElementById('filter-language').value;
        const timeFilter = document.getElementById('filter-time').value;

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfWeek = startOfDay - (now.getDay() * 24 * 60 * 60 * 1000);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        allData = allData.filter(d => d.language === langFilter);

        if (timeFilter === 'today') allData = allData.filter(d => d.timestamp >= startOfDay);
        else if (timeFilter === 'weekly') allData = allData.filter(d => d.timestamp >= startOfWeek);
        else if (timeFilter === 'monthly') allData = allData.filter(d => d.timestamp >= startOfMonth);

        filteredData = allData.sort((a, b) => b.timestamp - a.timestamp);

        currentPage = 1;
        renderTable();

        const wpmArr = allData.map(d => d.wpm);
        const max = wpmArr.length ? Math.max(...wpmArr) : 0;
        document.getElementById('top-speed').innerText = max + " WPM";

        const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b.wpm, 0) / arr.length) : 0;

        document.getElementById('daily-avg').innerText = avg(filteredData.filter(d => d.timestamp >= startOfDay)) + " WPM";
        document.getElementById('monthly-avg').innerText = avg(filteredData.filter(d => d.timestamp >= startOfMonth)) + " WPM";
        document.getElementById('weekly-avg').innerText = avg(filteredData.filter(d => d.timestamp >= startOfWeek)) + " WPM";
    };
}

/**
 * Render tabel history
 */
function renderTable() {
    const start = (currentPage - 1) * rowsPerPage;
    const items = filteredData.slice(start, start + rowsPerPage);
    const tbody = document.getElementById('history-body');
    if (!tbody) return;

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Belum ada data.</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(d => {
        let accClass = "acc-low";
        if (d.accuracy >= 95) accClass = "acc-high";
        else if (d.accuracy >= 80) accClass = "acc-mid";

        let modeBadge = d.mode && d.mode !== "Normal"
            ? `<span class="table-badge">${d.mode}</span>`
            : `<span style="color:#64748b; font-size: 0.8rem;">Normal</span>`;

        return `
    <tr>
        <td>${new Date(d.timestamp).toLocaleString('id-ID')}</td>
        <td><strong style="color: var(--primary)">${d.wpm} WPM</strong></td>
        <td class="${accClass}">${d.accuracy}%</td>
        <td><span class="level-badge level-${d.level}">Level ${d.level}</span></td>
        <td>${modeBadge}</td>
        <td>${d.duration}s</td>
    </tr>
    `
    }).join('');

    document.getElementById('page-info').innerText = `Hal ${currentPage}`;
    document.getElementById('prev-btn').disabled = currentPage === 1;
    document.getElementById('next-btn').disabled = (start + rowsPerPage) >= filteredData.length;
}

/**
 * Reset status tantangan (untuk testing)
 */
function resetChallengeStatus() {
    localStorage.removeItem('challengeLevels');
    localStorage.removeItem('challengeXP');
    challengeLevels = {};
    challengeXP = {};

    Object.keys(challengeRequirements).forEach(challenge => {
        challengeLevels[challenge] = 1;
        challengeXP[challenge] = 0;
    });

    updateAllChallengeCards();
    alert('Status tantangan direset!');
}

/**
 * Ganti halaman dashboard
 */
function changePage(step) {
    currentPage += step;
    renderTable();
}

/**
 * Export data ke JSON
 */
function exportData() {
    if (!db) return;
    db.transaction("scores", "readonly").objectStore("scores").getAll().onsuccess = e => {
        const data = e.target.result;
        if (!data.length) return alert("Data kosong.");
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `typing_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };
}

/**
 * Handle import data dari file
 */
function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) throw new Error("Format file salah (harus Array JSON).");

            const tx = db.transaction(["scores"], "readwrite");
            let count = 0;
            data.forEach(item => {
                const { id, ...rest } = item;
                tx.objectStore("scores").add(rest);
                count++;
            });
            tx.oncomplete = () => {
                alert(`Sukses mengimpor ${count} data!`);
                refreshDashboard();
            };
        } catch (err) { alert("Gagal Import: " + err.message); }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ============================================
// UTILS & LISTENERS
// ============================================

/**
 * Toggle mode pro (warna keyboard)
 */
function toggleProMode() {
    showColors = !showColors;
    const container = document.querySelector('.keyboard-container');
    const btn = document.getElementById('pro-mode-btn');
    if (!showColors) {
        container.classList.add('pro-mode');
        btn.innerText = "Mode: PRO (Warna Off)";
    } else {
        container.classList.remove('pro-mode');
        btn.innerText = "Mode: Pemula (Warna On)";
    }
}

/**
 * Update tampilan keyboard (caps lock, shift)
 */
function updateKeyboardDisplay() {
    document.querySelectorAll('.key').forEach(key => {
        const char = key.getAttribute('data-key');
        const shift = key.getAttribute('data-shift');
        if (!char) return;

        if (char.length === 1 && char.match(/[a-z]/i)) {
            key.innerText = (isShiftActive ^ isCapsLockActive) ? char.toUpperCase() : char.toLowerCase();
        } else if (shift) {
            key.innerText = isShiftActive ? shift : char;
        }
    });
}

/**
 * Shuffle array (untuk kata acak)
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Fokus ke input typing
 */
function focusInput() {
    document.getElementById('typing-input').focus();
}

// ============================================
// EVENT LISTENERS
// ============================================

// Event listeners untuk dropdown
document.getElementById('lang-selector').addEventListener('change', e => { 
    currentLang = e.target.value; 
    renderNewTest(); 
});

document.getElementById('level-selector').addEventListener('change', e => {
    currentLevel = parseInt(e.target.value);
    currentWordLevel = currentLevel;

    document.getElementById('challenge-word-level').value = currentLevel;
    challengeWordLevel = currentLevel;

    localStorage.setItem('currentWordLevel', currentLevel.toString());

    renderNewTest();
});

document.getElementById('length-selector').addEventListener('change', e => { 
    currentLength = e.target.value; 
    renderNewTest(); 
});

document.getElementById('case-mode').addEventListener('change', renderNewTest);

// Event listener untuk shift+enter di modal
document.addEventListener('keydown', function handleShiftEnter(e) {
    const modal = document.getElementById('custom-alert');
    if (modal && modal.style.display === 'flex' && e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        repeatTest();
    }
});

// Event listener untuk keyboard
document.addEventListener('keydown', (e) => {
    if (!e.key) return;
    const modal = document.getElementById('custom-alert');

    if (modal.style.display === 'flex' && e.key === 'Enter') {
        e.preventDefault();
        closeModal();
        return;
    }

    if (e.key === 'Escape') { renderNewTest(); return; }
    if (typeof e.getModifierState === 'function') isCapsLockActive = e.getModifierState('CapsLock');
    if (e.key === 'Shift') isShiftActive = true;

    if (isNoSpaceMode && e.key === " ") { e.preventDefault(); return; }

    let keyId = e.key === " " ? " " : e.key;
    if (keyId) {
        const el = document.querySelector(`.key[data-key="${keyId.toLowerCase()}"]`) ||
            document.querySelector(`.key[data-key="${keyId}"]`);
        if (el) el.classList.add('active');
    }
    updateKeyboardDisplay();
});

document.addEventListener('keyup', (e) => {
    if (!e.key) return;
    if (e.key === 'Shift') isShiftActive = false;

    let keyId = e.key === " " ? " " : e.key;
    if (keyId) {
        const el = document.querySelector(`.key[data-key="${keyId.toLowerCase()}"]`) ||
            document.querySelector(`.key[data-key="${keyId}"]`);
        if (el) el.classList.remove('active');
    }
    updateKeyboardDisplay();
});

// ============================================
// INISIALISASI SAAT LOAD
// ============================================

window.onload = function () {
    loadConfig();
    initAudio();

    document.addEventListener('keydown', function globalShortcuts(e) {
        const activePage = document.querySelector('.page.active').id;

        const modal = document.getElementById('custom-alert');
        if (modal && modal.style.display === 'flex') {
            if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                repeatTest();
                return;
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                closeModal();
                return;
            }
        }

        const challengeModal = document.getElementById('challenge-start-modal');
        if (challengeModal && e.key === 'Enter') {
            e.preventDefault();
            const startBtn = challengeModal.querySelector('button[onclick*="startChallengeFromAlert"]');
            if (startBtn) startBtn.click();
        }

        const forbiddenModal = document.getElementById('forbidden-letters-modal');
        if (forbiddenModal && e.key === 'Enter') {
            e.preventDefault();
            const confirmBtn = forbiddenModal.querySelector('button[onclick*="submitForbiddenLetters"]');
            if (confirmBtn) confirmBtn.click();
        }
    });

    setTimeout(() => {
        const savedWordLevel = localStorage.getItem('currentWordLevel');
        if (savedWordLevel) {
            const level = parseInt(savedWordLevel);
            challengeWordLevel = level;
            currentWordLevel = level;
            currentLevel = level;

            const challengeSelector = document.getElementById('challenge-word-level');
            const levelSelector = document.getElementById('level-selector');

            if (challengeSelector) challengeSelector.value = level;
            if (levelSelector) levelSelector.value = level;
        }

        getHistory((history) => {
            if (history && history.length > 0) {
                maxWPM = Math.max(...history.map(h => h.wpm));
                console.log('Loaded maxWPM from history:', maxWPM);
            }

            setTimeout(refreshAllUI, 100);

            Object.keys(challengeRequirements).forEach(type => {
                const data = getCurrentChallengeData(type);
                console.log(`${type}: Level ${data.level}, XP ${data.xp}`);
            });
        });
    }, 1000);
};