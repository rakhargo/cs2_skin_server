document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const weaponSelect = document.getElementById('weapon-select');
    const paintInput = document.getElementById('paint-input');
    const seedInput = document.getElementById('seed-input');
    const wearSlider = document.getElementById('wear-slider');
    const wearVal = document.getElementById('wear-val');
    
    const genCommandDiv = document.getElementById('gen-command');
    const inspectLinkDiv = document.getElementById('inspect-link');
    
    const btnCopyGen = document.getElementById('btn-copy-gen');
    const btnCopyInspect = document.getElementById('btn-copy-inspect');
    
    const steamIdInput = document.getElementById('steamid-input');
    const btnSendServer = document.getElementById('btn-send-server');
    const rconStatus = document.getElementById('rcon-status');
    const wearBands = document.querySelectorAll('.wear-bands .band');

    // New DOM Elements for Search & Preview
    const skinSearchInput = document.getElementById('skin-search');
    const skinDropdownList = document.getElementById('skin-dropdown-list');
    const skinPreviewImg = document.getElementById('skin-preview-img');
    const skinPreviewPlaceholder = document.getElementById('skin-preview-placeholder');
    const skinPreviewDetails = document.getElementById('skin-preview-details');
    const previewTitle = document.getElementById('preview-title');
    const previewSubtitle = document.getElementById('preview-subtitle');

    let debounceTimer;
    let allSkins = [];
    let filteredSkins = [];

    // Load persisted SteamID from LocalStorage
    const savedSteamId = localStorage.getItem('cs2_inspect_steamid');
    if (savedSteamId) {
        steamIdInput.value = savedSteamId;
    }

    // ==========================================
    // DATA LOADING & FILTERING
    // ==========================================

    // Fetch skins database
    async function loadSkinsDatabase() {
        try {
            const res = await fetch('/skins.json');
            allSkins = await res.json();
            console.log(`Loaded ${allSkins.length} skins from database.`);
            
            // Set initial state matching Glock-18 with Case Hardened (44)
            handlePaintInputManualChange();
        } catch (err) {
            console.error("Failed to load skins database:", err);
        }
    }

    function filterSkinsForSelectedWeapon() {
        const defindex = parseInt(weaponSelect.value);
        
        // Filter by selected weapon
        filteredSkins = allSkins.filter(skin => skin.defindex === defindex);
        
        // Filter by search query if present
        const query = skinSearchInput.value.trim().toLowerCase();
        if (query) {
            filteredSkins = filteredSkins.filter(skin => 
                skin.pattern_name.toLowerCase().includes(query) || 
                skin.full_name.toLowerCase().includes(query)
            );
        }

        renderDropdownList();
    }

    function renderDropdownList() {
        skinDropdownList.innerHTML = '';
        if (filteredSkins.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'dropdown-item';
            noResults.style.color = '#64748b';
            noResults.style.cursor = 'default';
            noResults.textContent = 'No presets found';
            skinDropdownList.appendChild(noResults);
            return;
        }

        // Limit results to 50 for rendering performance
        const limit = Math.min(filteredSkins.length, 50);
        for (let i = 0; i < limit; i++) {
            const skin = filteredSkins[i];
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            
            const img = document.createElement('img');
            img.src = skin.image || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="27" viewBox="0 0 36 27"></svg>';
            img.alt = skin.pattern_name;
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'skin-name';
            nameSpan.textContent = skin.pattern_name;

            const idSpan = document.createElement('span');
            idSpan.className = 'paint-id';
            idSpan.textContent = `#${skin.paintindex}`;

            item.appendChild(img);
            item.appendChild(nameSpan);
            item.appendChild(idSpan);

            item.addEventListener('click', () => {
                selectSkin(skin);
            });

            skinDropdownList.appendChild(item);
        }
    }

    function selectSkin(skin) {
        skinSearchInput.value = skin.pattern_name;
        paintInput.value = skin.paintindex;
        
        // Hide dropdown
        skinDropdownList.classList.add('hidden');
        
        // Adjust wear slider range to match skin's official floats
        wearSlider.min = skin.min_float.toFixed(4);
        wearSlider.max = skin.max_float.toFixed(4);
        
        // Clamp current wear value to match the new bounds if necessary
        let currentWear = parseFloat(wearSlider.value);
        if (currentWear < skin.min_float) {
            wearSlider.value = skin.min_float;
            wearVal.textContent = skin.min_float.toFixed(4);
        } else if (currentWear > skin.max_float) {
            wearSlider.value = skin.max_float;
            wearVal.textContent = skin.max_float.toFixed(4);
        }

        updatePreviewCard(skin);
        updateOutputs();
    }

    function handlePaintInputManualChange() {
        const defindex = parseInt(weaponSelect.value);
        const paintindex = parseInt(paintInput.value) || 0;

        const matchingSkin = allSkins.find(skin => skin.defindex === defindex && skin.paintindex === paintindex);

        if (matchingSkin) {
            skinSearchInput.value = matchingSkin.pattern_name;
            updatePreviewCard(matchingSkin);
            
            wearSlider.min = matchingSkin.min_float.toFixed(4);
            wearSlider.max = matchingSkin.max_float.toFixed(4);
        } else {
            skinSearchInput.value = '';
            clearPreviewCard();
            
            wearSlider.min = "0.0000";
            wearSlider.max = "1.0000";
        }

        updateOutputs();
    }

    function updatePreviewCard(skin) {
        if (skin && skin.image) {
            skinPreviewImg.src = skin.image;
            skinPreviewImg.classList.remove('hidden');
            skinPreviewPlaceholder.classList.add('hidden');
            skinPreviewDetails.classList.remove('hidden');
            
            previewTitle.textContent = skin.full_name;
            previewSubtitle.textContent = `Paint Kit ID: ${skin.paintindex} (Float: ${skin.min_float.toFixed(2)} - ${skin.max_float.toFixed(2)})`;
        } else {
            clearPreviewCard();
        }
    }

    function clearPreviewCard() {
        skinPreviewImg.src = '';
        skinPreviewImg.classList.add('hidden');
        skinPreviewPlaceholder.classList.remove('hidden');
        skinPreviewDetails.classList.add('hidden');
    }

    // ==========================================
    // UI EVENT LISTENERS
    // ==========================================

    // Weapon Select Change
    weaponSelect.addEventListener('change', () => {
        skinSearchInput.value = '';
        paintInput.value = '0';
        clearPreviewCard();
        
        // Reset slider bounds
        wearSlider.min = "0.0000";
        wearSlider.max = "1.0000";
        
        filterSkinsForSelectedWeapon();
        updateOutputs();
    });

    // Skin Search Events
    skinSearchInput.addEventListener('input', () => {
        skinDropdownList.classList.remove('hidden');
        filterSkinsForSelectedWeapon();
    });

    skinSearchInput.addEventListener('focus', () => {
        skinDropdownList.classList.remove('hidden');
        filterSkinsForSelectedWeapon();
    });

    // Click outside search closes dropdown
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown-container')) {
            skinDropdownList.classList.add('hidden');
        }
    });

    // Manual Paint Input Change
    paintInput.addEventListener('input', handlePaintInputManualChange);
    paintInput.addEventListener('change', handlePaintInputManualChange);

    // Update Wear Slider Label
    wearSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value).toFixed(4);
        wearVal.textContent = value;
        updateOutputs();
    });

    // Handle Wear Band Clicks
    wearBands.forEach(band => {
        band.addEventListener('click', () => {
            const wear = parseFloat(band.getAttribute('data-wear'));
            const min = parseFloat(wearSlider.min);
            const max = parseFloat(wearSlider.max);
            
            // Clamp clicked value to current slider bounds
            const clampedWear = Math.max(min, Math.min(max, wear));
            
            wearSlider.value = clampedWear;
            wearVal.textContent = clampedWear.toFixed(4);
            updateOutputs();
        });
    });

    // Input Event Listeners
    [seedInput].forEach(el => {
        el.addEventListener('change', updateOutputs);
        el.addEventListener('input', updateOutputs);
    });

    // Update values and call generation API
    function updateOutputs() {
        const defindex = parseInt(weaponSelect.value);
        const paintindex = parseInt(paintInput.value) || 0;
        const paintseed = parseInt(seedInput.value) || 0;
        const paintwear = parseFloat(wearSlider.value);

        // Update local text box immediately (Offline Command)
        genCommandDiv.textContent = `!gen ${defindex} ${paintindex} ${paintseed} ${paintwear.toFixed(4)}`;

        // Debounce API calls for the masked inspect link to avoid spamming the backend
        clearTimeout(debounceTimer);
        inspectLinkDiv.textContent = 'Generating masked link...';
        
        debounceTimer = setTimeout(() => {
            fetchInspectLink(defindex, paintindex, paintseed, paintwear);
        }, 300);
    }

    // Fetch masked link from Node.js backend
    async function fetchInspectLink(defindex, paintindex, paintseed, paintwear) {
        try {
            const query = `defindex=${defindex}&paintindex=${paintindex}&paintseed=${paintseed}&paintwear=${paintwear}`;
            const response = await fetch(`/api/generate?${query}`);
            const data = await response.json();
            
            if (data.success && data.inspectUrl) {
                inspectLinkDiv.textContent = data.inspectUrl;
            } else {
                inspectLinkDiv.textContent = 'Error generating inspect link';
            }
        } catch (err) {
            console.error('Failed to generate inspect link:', err);
            inspectLinkDiv.textContent = 'API connection error';
        }
    }

    // ==========================================
    // CLIPBOARD COPY HANDLERS
    // ==========================================
    [btnCopyGen, btnCopyInspect].forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            let textToCopy = targetEl.textContent;

            // If copying masked link, prepend "!i " for chat command
            if (targetId === 'inspect-link') {
                textToCopy = `!i ${textToCopy}`;
            }

            navigator.clipboard.writeText(textToCopy)
                .then(() => {
                    const originalText = btn.textContent;
                    btn.textContent = 'Copied!';
                    btn.classList.remove('btn-secondary');
                    btn.classList.add('btn-primary');
                    
                    setTimeout(() => {
                        btn.textContent = originalText;
                        btn.classList.remove('btn-primary');
                        btn.classList.add('btn-secondary');
                    }, 1500);
                })
                .catch(err => {
                    console.error('Clipboard copy failed:', err);
                });
        });
    });

    // ==========================================
    // RCON SEND TO SERVER HANDLER
    // ==========================================
    btnSendServer.addEventListener('click', async () => {
        const steamId = steamIdInput.value.trim();
        const defindex = parseInt(weaponSelect.value);
        const paintindex = parseInt(paintInput.value) || 0;
        const paintseed = parseInt(seedInput.value) || 0;
        const paintwear = parseFloat(wearSlider.value);

        if (!steamId) {
            showRconStatus('SteamID64 is required to send to server.', 'error');
            return;
        }

        if (!/^\d{17}$/.test(steamId)) {
            showRconStatus('SteamID64 must be a 17-digit number.', 'error');
            return;
        }

        // Save SteamID for future visits
        localStorage.setItem('cs2_inspect_steamid', steamId);

        showRconStatus('Sending skin config to CS2 Server...', 'success');

        try {
            const response = await fetch('/api/send-to-server', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    steamId,
                    defindex,
                    paintindex,
                    paintseed,
                    paintwear
                })
            });

            const data = await response.json();
            if (data.success) {
                showRconStatus('Success! Skin spawned in your hands.', 'success');
            } else {
                showRconStatus(data.error || 'Server rejected request.', 'error');
            }
        } catch (err) {
            console.error('RCON POST error:', err);
            showRconStatus('RCON connection failed. Check console or backend config.', 'error');
        }
    });

    function showRconStatus(msg, type) {
        rconStatus.textContent = msg;
        rconStatus.className = `status-msg ${type}`;
        
        if (type === 'success' && !msg.includes('Sending')) {
            setTimeout(() => {
                rconStatus.className = 'status-msg hidden';
            }, 4000);
        }
    }

    // Initialize Database on Page Load
    loadSkinsDatabase();
});
