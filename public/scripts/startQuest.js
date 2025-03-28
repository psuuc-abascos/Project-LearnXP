document.addEventListener("DOMContentLoaded", () => {
    // Start Quest Functionality
    const walletAddress = localStorage.getItem("walletAddress");
    const role = localStorage.getItem("selectedRole");
    const loadingOverlay = document.getElementById("loadingOverlay");
    const loadingMessage = document.getElementById("loadingMessage");
    const questTitle = document.getElementById("questTitle");
    const questDescription = document.getElementById("questDescription");
    const questVideo = document.getElementById("questVideo");
    const completeQuestBtn = document.getElementById("completeQuestBtn");
    const backBtn = document.getElementById("backBtn");

    if (!walletAddress || !role) {
        console.log("Redirecting to index.html due to missing wallet or role");
        window.location.href = "index.html";
        return;
    }

    // Extract query parameters from URL (questId and mapId)
    const urlParams = new URLSearchParams(window.location.search);
    const questId = urlParams.get("questId");
    const mapId = urlParams.get("mapId");

    if (!questId || !mapId) {
        console.error("Missing questId or mapId in URL parameters");
        loadingMessage.textContent = "Invalid quest or map data";
        loadingOverlay.classList.add("active");
        setTimeout(() => {
            window.location.href = "quest.html";
        }, 2000);
        return;
    }

    // Back button functionality
    backBtn.addEventListener("click", () => {
        console.log("Back button clicked, redirecting to quest.html with mapId:", mapId);
        window.location.href = `quest.html?mapId=${mapId}`;
    });

    // Sample quest data (same as in quest.js)
    const questMap = {
        1: [
            { id: 1, title: "Algebra Basics", description: "Solve basic equations.", xp: 30, badge: "Algebra Apprentice", videoUrl: "https://www.youtube.com/embed/ly4S0oi3Yz8" },
            { id: 2, title: "Graph Mastery", description: "Graph linear functions.", xp: 50, badge: "Graph Guru", videoUrl: "https://www.youtube.com/embed/ly4S0oi3Yz8" },
            { id: 3, title: "Equation Expert", description: "Solve advanced equations.", xp: 40, badge: "Math Master", videoUrl: "https://www.youtube.com/embed/ly4S0oi3Yz8" }
        ],
        2: [
            { id: 4, title: "Science Basics", description: "Conduct a simple experiment.", xp: 40, badge: "Science Scout", videoUrl: "https://www.youtube.com/embed/ly4S0oi3Yz8" },
            { id: 5, title: "Physics Puzzle", description: "Solve 5 physics problems.", xp: 60, badge: "Physics Pro", videoUrl: "https://www.youtube.com/embed/ly4S0oi3Yz8" }
        ],
        3: [
            { id: 6, title: "Filipino Tales", description: "Write a short story.", xp: 70, badge: "Storyteller", videoUrl: "https://www.youtube.com/embed/ly4S0oi3Yz8" },
            { id: 7, title: "Culture Quiz", description: "Answer 10 questions.", xp: 80, badge: "Language Learner", videoUrl: "https://www.youtube.com/embed/ly4S0oi3Yz8" }
        ],
        4: [
            { id: 8, title: "Art Creation", description: "Create a drawing.", xp: 50, badge: "Art Aficionado", videoUrl: "https://www.youtube.com/embed/ly4S0oi3Yz8" },
            { id: 9, title: "Fitness Test", description: "Complete a workout.", xp: 60, badge: "Fitness Fan", videoUrl: "https://www.youtube.com/embed/ly4S0oi3Yz8" }
        ],
        5: [
            { id: 10, title: "Code Basics", description: "Write a simple program.", xp: 70, badge: "Coder", videoUrl: "https://www.youtube.com/embed/ly4S0oi3Yz8" },
            { id: 11, title: "Tech Quiz", description: "Answer 10 ICT questions.", xp: 80, badge: "Tech Titan", videoUrl: "https://www.youtube.com/embed/ly4S0oi3Yz8" }
        ],
        6: [
            { id: 12, title: "Grammar Basics", description: "Correct 10 sentences.", xp: 40, badge: "Grammar Guide", videoUrl: "https://www.youtube.com/embed/ly4S0oi3Yz8" },
            { id: 13, title: "Essay Challenge", description: "Write a 200-word essay.", xp: 60, badge: "Essay Expert", videoUrl: "https://www.youtube.com/embed/ly4S0oi3Yz8" }
        ]
    };

    const sampleMaps = [
        { id: 1, name: "World of Algebra", description: "Master algebraic equations.", image: "/icons/Map1.png" },
        { id: 2, name: "Realm of Science", description: "Explore scientific principles.", image: "/icons/Map2.png" },
        { id: 3, name: "Filipino Fortress", description: "Dive into Filipino culture.", image: "/icons/Map3.png" },
        { id: 4, name: "MAPEH Empire", description: "Excel in arts and PE.", image: "/icons/Map4.png" },
        { id: 5, name: "ICT Utopia", description: "Learn tech and innovation.", image: "/icons/Map5.png" },
        { id: 6, name: "English Wilderness", description: "Conquer the English language.", image: "/icons/Map6.png" }
    ];

    // Fetch quest and map details
    let questData = null;
    let mapData = null;

    // First, try to fetch map data
    fetch(`/maps/${walletAddress}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            const maps = data.maps || sampleMaps;
            mapData = maps.find(map => map.id == mapId);
            if (!mapData) throw new Error("Map not found");
            questTitle.textContent = mapData.name;

            // Now fetch quest data
            return fetch(`/quests/${walletAddress}/${mapId}`);
        })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            const quests = data.quests || questMap[mapId] || [];
            questData = quests.find(quest => quest.id == questId);
            if (!questData) throw new Error("Quest not found");

            // Update UI with quest details
            questDescription.textContent = questData.description;
            questVideo.src = questData.videoUrl || "https://www.youtube.com/embed/ly4S0oi3Yz8"; // Fallback video
        })
        .catch(error => {
            console.error("Error fetching quest/map data:", error);
            // Fallback to sample data
            mapData = sampleMaps.find(map => map.id == mapId) || { name: "Unknown Map" };
            questTitle.textContent = mapData.name;
            const quests = questMap[mapId] || [];
            questData = quests.find(quest => quest.id == questId) || {
                title: "Unknown Quest",
                description: "Quest data not available.",
                xp: 0,
                badge: "None",
                videoUrl: "https://www.youtube.com/embed/ly4S0oi3Yz8"
            };
            questDescription.textContent = questData.description;
            questVideo.src = questData.videoUrl;
        });

    // Tab switching logic
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            tabButtons.forEach(btn => btn.classList.remove("active"));
            tabContents.forEach(content => content.classList.remove("active"));

            button.classList.add("active");
            const tabId = button.getAttribute("data-tab");
            document.getElementById(`${tabId}Tab`).classList.add("active");
        });
    });

    // Complete quest functionality
    completeQuestBtn.addEventListener("click", () => {
        if (!questData) {
            alert("Quest data not loaded. Please try again.");
            return;
        }
        startQuest(questId, mapId);
    });

    function startQuest(questId, mapId) {
        console.log("Starting quest:", questId, "for map:", mapId);
        loadingOverlay.classList.add("active");
        loadingMessage.textContent = "Completing Quest...";

        fetch(`/start-quest/${walletAddress}`, {
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
                alert(`Quest "${data.quest.title}" completed! Earned ${data.quest.xp} XP and badge: ${data.quest.badge}`);
                window.location.href = `quest.html?mapId=${mapId}`;
            } else {
                alert("Failed to complete quest: " + (data.message || "Unknown error"));
                window.location.href = `quest.html?mapId=${mapId}`;
            }
        })
        .catch(error => {
            console.error("Error completing quest:", error);
            loadingOverlay.classList.remove("active");
            loadingMessage.textContent = "";
            localStorage.setItem(`quest_${questId}_status_${walletAddress}`, "completed");
            alert(`Quest completed (simulated due to error). Earned ${questData.xp} XP and badge: ${questData.badge}`);
            window.location.href = `quest.html?mapId=${mapId}`;
        });
    }
});