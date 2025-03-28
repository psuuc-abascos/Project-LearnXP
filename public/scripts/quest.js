document.addEventListener("DOMContentLoaded", () => {
    const walletAddress = localStorage.getItem("walletAddress");
    const role = localStorage.getItem("selectedRole");
    const loadingOverlay = document.getElementById("loadingOverlay");
    const loadingMessage = document.getElementById("loadingMessage");
    const mapContainer = document.getElementById("mapContainer");

    console.log("DOM loaded, walletAddress:", walletAddress, "role:", role);

    if (!walletAddress || !role) {
        console.log("Redirecting to index.html due to missing wallet or role");
        window.location.href = "index.html";
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.style.display = "none";
    const ctx = canvas.getContext("2d");
    document.body.appendChild(canvas);

    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    function generatePosition(walletAddress, mapId, usedPositions) {
        console.log("Generating position for mapId:", mapId);
        const seed = simpleHash(walletAddress + mapId);
        const mapWidth = 200;
        const mapHeight = 200;
        const containerWidth = mapContainer.offsetWidth;
        const containerHeight = mapContainer.offsetHeight;
        const minDistance = mapWidth + 40;
        const maxAttempts = 50;

        let randomTop, randomLeft;
        let attempts = 0;
        let positionFound = false;

        while (attempts < maxAttempts && !positionFound) {
            randomTop = (seed + attempts * 17) % (containerHeight - mapHeight);
            randomLeft = ((seed + attempts * 23) * mapId) % (containerWidth - mapWidth);
            
            randomTop = Math.max(0, Math.min(randomTop, containerHeight - mapHeight));
            randomLeft = Math.max(0, Math.min(randomLeft, containerWidth - mapWidth));

            let tooClose = false;
            for (const pos of usedPositions) {
                const dx = Math.abs(pos.left - randomLeft);
                const dy = Math.abs(pos.top - randomTop);
                if (Math.sqrt(dx * dx + dy * dy) < minDistance) {
                    tooClose = true;
                    break;
                }
            }

            if (!tooClose) {
                positionFound = true;
            }
            attempts++;
        }

        if (!positionFound) {
            const gridSize = Math.ceil(Math.sqrt(usedPositions.length + 1));
            const row = Math.floor(usedPositions.length / gridSize);
            const col = usedPositions.length % gridSize;
            randomTop = row * (mapHeight + 40);
            randomLeft = col * (mapWidth + 40);

            randomTop = Math.min(randomTop, containerHeight - mapHeight);
            randomLeft = Math.min(randomLeft, containerWidth - mapWidth);
        }

        usedPositions.push({ top: randomTop, left: randomLeft });
        const position = { top: randomTop + "px", left: randomLeft + "px" };
        console.log("Position generated for mapId", mapId, ":", position);
        return position;
    }

    function floodFill(data, width, height, startX, startY, isLandPixel) {
        const visited = new Set();
        const stack = [[startX, startY]];
        const pixels = [];
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];

        while (stack.length > 0) {
            const [x, y] = stack.pop();
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            const key = `${x},${y}`;
            if (visited.has(key)) continue;

            visited.add(key);
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (isLandPixel(r, g, b, a)) {
                pixels.push({ x, y });
                for (const [dx, dy] of directions) {
                    stack.push([x + dx, y + dy]);
                }
            }
        }

        return pixels;
    }

    function findLargestLandmass(data, width, height, isLandPixel) {
        const visited = new Set();
        let largestLandmass = [];
        let maxSize = 0;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const key = `${x},${y}`;
                if (visited.has(key)) continue;

                const i = (y * width + x) * 4;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];

                if (isLandPixel(r, g, b, a)) {
                    const landmass = floodFill(data, width, height, x, y, isLandPixel);
                    landmass.forEach(pixel => visited.add(`${pixel.x},${pixel.y}`));
                    if (landmass.length > maxSize) {
                        maxSize = landmass.length;
                        largestLandmass = landmass;
                    }
                }
            }
        }

        return largestLandmass;
    }

    function isPositionOnLand(data, width, height, topPercent, leftPercent, isLandPixel) {
        const x = Math.floor((leftPercent / 100) * width);
        const y = Math.floor((topPercent / 100) * height);
        if (x < 0 || x >= width || y < 0 || y >= height) return false;

        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        return isLandPixel(r, g, b, a);
    }

    function applyRepulsion(position, usedPositions, minDistancePercent, bounds) {
        let { top, left } = position;
        const repulsionStrength = 0.7;
        const maxRepulsionSteps = 15;

        for (let step = 0; step < maxRepulsionSteps; step++) {
            let moved = false;
            for (const otherPos of usedPositions) {
                const dx = left - otherPos.left;
                const dy = top - otherPos.top;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < minDistancePercent && distance > 0) {
                    const pushX = (dx / distance) * (minDistancePercent - distance) * repulsionStrength;
                    const pushY = (dy / distance) * (minDistancePercent - distance) * repulsionStrength;
                    left += pushX;
                    top += pushY;
                    moved = true;
                }
            }

            top = Math.max(bounds.minY, Math.min(bounds.maxY, top));
            left = Math.max(bounds.minX, Math.min(bounds.maxX, left));

            if (!moved) break;
        }

        return { top, left };
    }

    function generateQuestPosition(index, mapImageSrc, usedQuestPositions) {
        return new Promise((resolve) => {
            console.log("Generating quest position for index:", index, "image:", mapImageSrc);
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = mapImageSrc;
            img.onload = () => {
                console.log("Image loaded for positioning:", mapImageSrc);
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, img.width, img.height);
                const data = imageData.data;

                const isLandPixel = (r, g, b, a) => {
                    const isGreen = g > r && g > b && g > 40 && a > 150;
                    const isBrown = r > g && r > b && r > 40 && g > 15 && a > 150;
                    const isOcean = b > r + g && b > 80 && a > 150;
                    return (isGreen || isBrown) && !isOcean;
                };

                const largestLandmass = findLargestLandmass(data, img.width, img.height, isLandPixel);
                console.log("Largest landmass size:", largestLandmass.length);

                let position = { top: 50, left: 50 };
                if (largestLandmass.length > 0) {
                    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                    let totalX = 0, totalY = 0;

                    largestLandmass.forEach(pixel => {
                        totalX += pixel.x;
                        totalY += pixel.y;
                        minX = Math.min(minX, pixel.x);
                        maxX = Math.max(maxX, pixel.x);
                        minY = Math.min(minY, pixel.y);
                        maxY = Math.max(maxY, pixel.y);
                    });

                    const cx = totalX / largestLandmass.length;
                    const cy = totalY / largestLandmass.length;
                    const centroidX = (cx / img.width) * 100;
                    const centroidY = (cy / img.height) * 100;

                    const bufferPercent = 7;
                    const minXPercent = (minX / img.width) * 100 + bufferPercent;
                    const maxXPercent = (maxX / img.width) * 100 - bufferPercent;
                    const minYPercent = (minY / img.height) * 100 + bufferPercent;
                    const maxYPercent = (maxY / img.height) * 100 - bufferPercent;

                    const bounds = { minX: minXPercent, maxX: maxXPercent, minY: minYPercent, maxY: maxYPercent };
                    console.log("Landmass bounding box (percent):", bounds);
                    console.log("Land centroid (percent):", { top: centroidY, left: centroidX });

                    position = { top: centroidY, left: centroidX };
                    const questWidthPercent = (120 / 800) * 100;
                    const minDistancePercent = questWidthPercent + 8.75;
                    const maxAttempts = 30;
                    let attempts = 0;
                    let positionFound = false;

                    while (attempts < maxAttempts && !positionFound) {
                        const offsetX = (Math.random() - 0.5) * 4;
                        const offsetY = (Math.random() - 0.5) * 4;
                        let newTop = position.top + offsetY;
                        let newLeft = position.left + offsetX;

                        newTop = Math.max(0, Math.min(100, Math.max(minYPercent, Math.min(maxYPercent, newTop))));
                        newLeft = Math.max(0, Math.min(100, Math.max(minXPercent, Math.min(maxXPercent, newLeft))));

                        if (!isPositionOnLand(data, img.width, img.height, newTop, newLeft, isLandPixel)) {
                            attempts++;
                            continue;
                        }

                        const adjustedPosition = applyRepulsion(
                            { top: newTop, left: newLeft },
                            usedQuestPositions,
                            minDistancePercent,
                            bounds
                        );
                        newTop = adjustedPosition.top;
                        newLeft = adjustedPosition.left;

                        let tooClose = false;
                        for (const pos of usedQuestPositions) {
                            const dx = Math.abs(pos.left - newLeft);
                            const dy = Math.abs(pos.top - newTop);
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            if (distance < minDistancePercent) {
                                tooClose = true;
                                break;
                            }
                        }

                        if (!tooClose) {
                            position = { top: newTop, left: newLeft };
                            positionFound = true;
                            console.log(`Non-overlapping position found after ${attempts} attempts:`, position);
                        }
                        attempts++;
                    }

                    if (!positionFound) {
                        console.warn("No non-overlapping position found, using fallback within bounding box");
                        const fallbackPositions = [
                            { top: minYPercent + (maxYPercent - minYPercent) * 0.25, left: minXPercent + (maxXPercent - minXPercent) * 0.25 },
                            { top: minYPercent + (maxYPercent - minYPercent) * 0.75, left: minXPercent + (maxXPercent - minXPercent) * 0.75 },
                            { top: minYPercent + (maxYPercent - minYPercent) * 0.25, left: minXPercent + (maxXPercent - minXPercent) * 0.75 },
                            { top: minYPercent + (maxYPercent - minYPercent) * 0.75, left: minXPercent + (maxXPercent - minXPercent) * 0.25 }
                        ];
                        for (const fallback of fallbackPositions) {
                            let adjustedFallback = applyRepulsion(fallback, usedQuestPositions, minDistancePercent, bounds);
                            adjustedFallback.top = Math.max(0, Math.min(100, adjustedFallback.top));
                            adjustedFallback.left = Math.max(0, Math.min(100, adjustedFallback.left));
                            if (isPositionOnLand(data, img.width, img.height, adjustedFallback.top, adjustedFallback.left, isLandPixel)) {
                                let tooClose = false;
                                for (const pos of usedQuestPositions) {
                                    const dx = Math.abs(pos.left - adjustedFallback.left);
                                    const dy = Math.abs(pos.top - adjustedFallback.top);
                                    if (Math.sqrt(dx * dx + dy * dy) < minDistancePercent) {
                                        tooClose = true;
                                        break;
                                    }
                                }
                                if (!tooClose) {
                                    position = adjustedFallback;
                                    break;
                                }
                            }
                        }
                    }
                } else {
                    console.warn("No land detected, using fallback position");
                    position = { top: 30, left: 30 };
                }

                usedQuestPositions.push(position);
                console.log(`Position generated for quest ${index}:`, position);
                resolve({ top: `${position.top}%`, left: `${position.left}%` });
            };
            img.onerror = () => {
                console.error("Failed to load image for positioning:", mapImageSrc);
                const fallbackPositions = [
                    { top: "20%", left: "20%" },
                    { top: "40%", left: "60%" },
                    { top: "60%", left: "40%" },
                    { top: "80%", left: "70%" }
                ];
                const position = fallbackPositions[index % fallbackPositions.length];
                usedQuestPositions.push({ top: parseFloat(position.top), left: parseFloat(position.left) });
                resolve(position);
            };
        });
    }

    console.log("Initializing maps...");
    loadMaps();

    function loadMaps() {
        mapContainer.innerHTML = "";
        document.querySelector(".quests-title").textContent = "Quests";
        const existingBackButton = document.querySelector(".back-btn");
        if (existingBackButton) existingBackButton.remove();

        loadingOverlay.classList.add("active");
        loadingMessage.textContent = "Loading Maps...";
        fetch(`/maps/${walletAddress}`)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                console.log("Maps fetched successfully:", data);
                loadingOverlay.classList.remove("active");
                loadingMessage.textContent = "";
                const maps = data.maps || [];
                console.log("Using maps:", maps);
                const usedPositions = [];

                if (maps.length === 0) {
                    mapContainer.innerHTML = '<p style="color: white; text-align: center;">No classes available yet. Create a class in the Class Dashboard to start.</p>';
                    return;
                }

                maps.forEach(map => {
                    const mapCard = document.createElement("div");
                    mapCard.className = "map-card";
                    const position = generatePosition(walletAddress, map.id, usedPositions);
                    mapCard.style.top = position.top;
                    mapCard.style.left = position.left;
                    mapCard.innerHTML = `
                        <div class="map-wrapper">
                            <img src="${map.image}" alt="${map.name}" class="map-image" 
                                 onload="console.log('Map image loaded:', '${map.image}')" 
                                 onerror="console.error('Map image load failed:', '${map.image}'); this.onerror=null; this.src='https://via.placeholder.com/200x200.png?text=Island+Error';">
                            <div class="map-label">
                                <h3>${map.name}</h3>
                            </div>
                        </div>
                    `;
                    mapCard.addEventListener("click", () => loadQuests(map));
                    mapContainer.appendChild(mapCard);
                    console.log("Map card appended for:", map.name);
                });
            })
            .catch(error => {
                console.error("Error fetching maps:", error);
                loadingOverlay.classList.remove("active");
                loadingMessage.textContent = "";
                mapContainer.innerHTML = '<p style="color: white; text-align: center;">Failed to load maps. Please try again later.</p>';
            });
    }

    function loadQuests(map) {
        console.log("Loading quests for map:", map.name);
        mapContainer.innerHTML = "";
        document.querySelector(".quests-title").textContent = map.name;

        const backButton = document.createElement("button");
        backButton.textContent = "Back to Maps";
        backButton.className = "back-btn";
        backButton.addEventListener("click", loadMaps);
        document.querySelector(".title-container").appendChild(backButton);

        const zoomedMapCard = document.createElement("div");
        zoomedMapCard.className = "map-card zoomed";
        zoomedMapCard.innerHTML = `
            <div class="map-wrapper">
                <img src="${map.image}" alt="${map.name}" class="map-image" 
                     onload="console.log('Zoomed map image loaded:', '${map.image}')" 
                     onerror="console.error('Zoomed map image load failed:', '${map.image}'); this.onerror=null; this.src='https://via.placeholder.com/800x800.png?text=Island+Error';">
            </div>
        `;
        mapContainer.appendChild(zoomedMapCard);
        console.log("Zoomed map card appended");

        loadingOverlay.classList.add("active");
        loadingMessage.textContent = `Loading ${map.name} Quests...`;

        fetch(`/quests/${walletAddress}/${map.id}`)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                console.log("Quests fetched successfully:", data);
                loadingOverlay.classList.remove("active");
                loadingMessage.textContent = "";
                let quests = data.quests.length > 0 ? data.quests : getSampleQuests(map.id);
                const userProgress = data.progress || {};

                let lastCompletedIndex = -1;
                quests.forEach((quest, index) => {
                    const status = userProgress[quest.id]?.status || "not_started";
                    if (status === "completed") {
                        lastCompletedIndex = index;
                    }
                });
                quests = quests.slice(0, lastCompletedIndex + 2);

                console.log("Filtered quests to process:", quests);

                if (quests.length === 0) {
                    console.warn("No quests available for map:", map.name);
                    return;
                }

                const usedQuestPositions = [];
                const questPromises = quests.map((quest, index) => {
                    console.log("Generating position for quest:", quest.title, "index:", index);
                    return generateQuestPosition(index, map.image, usedQuestPositions)
                        .then(position => {
                            console.log("Position generated for quest", quest.title, ":", position);
                            return { quest, position, progress: userProgress[quest.id] || { status: "not_started", completion: 0 } };
                        })
                        .catch(error => {
                            console.error("Error generating position for quest", quest.title, ":", error);
                            return { 
                                quest, 
                                position: { top: "20%", left: "20%" },
                                progress: userProgress[quest.id] || { status: "not_started", completion: 0 } 
                            };
                        });
                });

                Promise.all(questPromises)
                    .then(results => {
                        console.log("All quest positions generated:", results);
                        results.forEach(({ quest, position, progress }) => {
                            const questCard = document.createElement("div");
                            questCard.className = `quest-card ${progress.status === 'completed' ? 'completed' : 'not-finished'}`;
                            questCard.style.top = position.top;
                            questCard.style.left = position.left;
                            questCard.innerHTML = `
                                <h3>${quest.title}</h3>
                                <p>${quest.description}</p>
                                <button class="btn btn-${progress.status === 'completed' ? 'success' : 'warning'}">${progress.status === 'completed' ? 'Completed' : 'Not Finished'}</button>
                            `;
                            if (progress.status !== "completed") {
                                questCard.querySelector("button").addEventListener("click", () => showQuestModal(quest, map));
                            }
                            mapContainer.appendChild(questCard);
                            console.log("Quest card appended for:", quest.title, "at position:", position);
                        });
                    })
                    .catch(error => {
                        console.error("Error in processing quest positions:", error);
                        loadingOverlay.classList.remove("active");
                        loadingMessage.textContent = "";
                    });
            })
            .catch(error => {
                console.error("Error fetching quests:", error);
                loadingOverlay.classList.remove("active");
                loadingMessage.textContent = "";
                let quests = getSampleQuests(map.id);

                let lastCompletedIndex = -1;
                quests.forEach((quest, index) => {
                    const status = localStorage.getItem(`quest_${quest.id}_status_${walletAddress}`) || "not_started";
                    if (status === "completed") {
                        lastCompletedIndex = index;
                    }
                });
                quests = quests.slice(0, lastCompletedIndex + 2);

                console.log("Using filtered fallback quests:", quests);

                if (quests.length === 0) {
                    console.warn("No fallback quests available for map:", map.name);
                    return;
                }

                const usedQuestPositions = [];
                const questPromises = quests.map((quest, index) => {
                    console.log("Generating position for fallback quest:", quest.title, "index:", index);
                    return generateQuestPosition(index, map.image, usedQuestPositions)
                        .then(position => {
                            console.log("Position generated for fallback quest", quest.title, ":", position);
                            return { quest, position };
                        })
                        .catch(error => {
                            console.error("Error generating position for fallback quest", quest.title, ":", error);
                            return { quest, position: { top: "20%", left: "20%" } };
                        });
                });

                Promise.all(questPromises)
                    .then(results => {
                        console.log("All fallback quest positions generated:", results);
                        results.forEach(({ quest, position }) => {
                            const questCard = document.createElement("div");
                            const status = localStorage.getItem(`quest_${quest.id}_status_${walletAddress}`) || "not_finished";
                            questCard.className = `quest-card ${status === 'completed' ? 'completed' : 'not-finished'}`;
                            questCard.style.top = position.top;
                            questCard.style.left = position.left;
                            questCard.innerHTML = `
                                <h3>${quest.title}</h3>
                                <p>${quest.description}</p>
                                <button class="btn btn-${status === 'completed' ? 'success' : 'warning'}">${status === 'completed' ? 'Completed' : 'Not Finished'}</button>
                            `;
                            if (status !== "completed") {
                                questCard.querySelector("button").addEventListener("click", () => showQuestModal(quest, map));
                            }
                            mapContainer.appendChild(questCard);
                            console.log("Fallback quest card appended for:", quest.title, "at position:", position);
                        });
                    })
                    .catch(error => {
                        console.error("Error in processing fallback quest positions:", error);
                        loadingOverlay.classList.remove("active");
                        loadingMessage.textContent = "";
                    });
            });
    }

    function getSampleQuests(mapId) {
        console.log("Getting sample quests for mapId:", mapId);
        // Generic sample quests since maps are now dynamic
        const genericQuests = [
            { id: mapId * 100 + 1, title: "Basics Challenge", description: "Complete introductory tasks.", xp: 30, badge: "Beginner" },
            { id: mapId * 100 + 2, title: "Advanced Task", description: "Tackle harder problems.", xp: 50, badge: "Expert" },
            { id: mapId * 100 + 3, title: "Mastery Quest", description: "Prove your skills.", xp: 70, badge: "Master" }
        ];
        console.log("Sample quests retrieved:", genericQuests);
        return genericQuests;
    }

    function showQuestModal(quest, map) {
        console.log("Showing quest modal for:", quest.title);
    
        const modalOverlay = document.createElement("div");
        modalOverlay.className = "quest-modal-overlay";
    
        const modalContent = document.createElement("div");
        modalContent.className = "quest-modal-content";
        modalContent.innerHTML = `
            <button class="modal-close-btn">&times;</button>
            <h2>${map.name}</h2>
            <h3>${quest.title}</h3>
            <button class="accept-btn">Accept</button>
        `;
    
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);
    
        modalContent.querySelector(".modal-close-btn").addEventListener("click", () => {
            modalOverlay.remove();
        });
    
        modalContent.querySelector(".accept-btn").addEventListener("click", () => {
            modalOverlay.remove();
            window.location.href = `startQuest.html?questId=${quest.id}&mapId=${map.id}`;
        });
    
        modalOverlay.addEventListener("click", (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
            }
        });
    }

    function startQuest(questId, map) {
        console.log("Starting quest:", questId);
        loadingOverlay.classList.add("active");
        loadingMessage.textContent = "Starting Quest...";
        fetch(`/quests/start/${walletAddress}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questId })
        })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            loadingOverlay.classList.remove("active");
            loadingMessage.textContent = "";
            if (data.success) {
                localStorage.setItem(`quest_${questId}_status_${walletAddress}`, "completed");
                alert(`Quest "${data.quest.title}" completed!`);
                loadQuests(map);
            } else {
                alert("Failed to start quest: " + (data.message || "Unknown error"));
            }
        })
        .catch(error => {
            console.error("Error starting quest:", error);
            loadingOverlay.classList.remove("active");
            loadingMessage.textContent = "";
            localStorage.setItem(`quest_${questId}_status_${walletAddress}`, "completed");
            alert("Quest completed (simulated due to error).");
            loadQuests(map);
        });
    }

    document.getElementById("logoutLink").addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("logoutConfirm").style.display = "block";
    });
    document.getElementById("confirmLogout").addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "index.html";
    });
    document.getElementById("cancelLogout").addEventListener("click", () => {
        document.getElementById("logoutConfirm").style.display = "none";
    });

    document.getElementById("hamburgerMenu").addEventListener("click", () => {
        document.body.classList.toggle("sidebar-closed");
    });
});