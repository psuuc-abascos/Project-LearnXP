document.addEventListener("DOMContentLoaded", () => {
    const walletAddress = localStorage.getItem("walletAddress");
    const role = localStorage.getItem("selectedRole");
    const loadingOverlay = document.getElementById("loadingOverlay");
    const loadingMessage = document.getElementById("loadingMessage");
    const mapGrid = document.getElementById("mapGrid");
    const newClassModal = new bootstrap.Modal(document.getElementById("newClassModal"));
    const classTitleInput = document.getElementById("classTitle");
    const mapPreview = document.getElementById("mapPreview");
    const saveClassBtn = document.getElementById("saveClassBtn");

    if (!walletAddress || !role || role !== "Teacher") {
        console.log("Redirecting to index.html due to missing wallet, role, or incorrect role");
        window.location.href = "index.html";
        return;
    }

    const mapImages = [
        "/icons/Map1.png",
        "/icons/Map2.png",
        "/icons/Map3.png",
        "/icons/Map4.png",
        "/icons/Map5.png",
        "/icons/Map6.png"
    ];

    let maps = [];
    let selectedMap = null;
    let students = []; // Track students for the selected map

    function loadMaps() {
        loadingOverlay.classList.add("active");
        loadingMessage.textContent = "Loading Maps...";

        fetch(`/maps/${walletAddress}`)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                maps = data.maps || [];
                displayMaps(maps);
                loadingOverlay.classList.remove("active");
            })
            .catch(error => {
                console.error("Error fetching maps:", error);
                alert("Failed to load maps. Please try again later.");
                maps = [];
                displayMaps(maps);
                loadingOverlay.classList.remove("active");
            });
    }

    function displayMaps(maps) {
        mapGrid.innerHTML = "";
        if (maps.length === 0) {
            mapGrid.innerHTML = '<p class="empty-state"><i class="bi bi-exclamation-circle"></i> No classes created yet. Click "New Class" to add one.</p>';
            return;
        }
        maps.forEach(map => {
            const mapCard = document.createElement("div");
            mapCard.className = "map-card";
            mapCard.innerHTML = `
                <img src="${map.image}" alt="${map.name}" onerror="this.src='/icons/Map1.png';">
                <div class="map-name">${map.name.toUpperCase()}</div>
            `;
            mapCard.addEventListener("click", () => showMapDetails(map));
            mapGrid.appendChild(mapCard);
        });
    }

    function showMapDetails(map) {
        selectedMap = map;
        students = []; // Reset students for this map (in-memory; could be persisted in backend)
        mapGrid.innerHTML = `
            <div class="class-details">
                <h2>${map.name}</h2>
                <p>${map.description}</p>
                <div id="studentList" class="student-list">
                    <p>No students yet.</p>
                </div>
                <button class="add-student-btn" style="position: absolute; top: 10px; right: 10px;">Add Student</button>
            </div>
        `;

        document.querySelector(".add-student-btn").addEventListener("click", addStudent);
    }

    function updateStudentList() {
        const studentList = document.getElementById("studentList");
        if (students.length === 0) {
            studentList.innerHTML = "<p>No students yet.</p>";
        } else {
            studentList.innerHTML = "";
            students.forEach(student => {
                const studentDiv = document.createElement("div");
                studentDiv.className = "student-item";
                studentDiv.innerHTML = `
                    <p><strong>Name:</strong> ${student.name}</p>
                    <p><strong>Wallet:</strong> ${student.wallet}</p>
                `;
                studentList.appendChild(studentDiv);
            });
        }
    }

    function addStudent() {
        const studentWallet = prompt("Enter the student's wallet address:");
        if (!studentWallet) {
            alert("Please enter a valid wallet address.");
            return;
        }

        loadingOverlay.classList.add("active");
        loadingMessage.textContent = "Fetching student details...";

        // Fetch student details
        fetch(`/user/${studentWallet}`)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (!data.user || data.user.role !== "Student") {
                    throw new Error("No student found with this wallet address.");
                }

                const student = {
                    wallet: studentWallet,
                    name: data.user.name
                };

                // Assign map to student
                return fetch("/assign-map", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ studentWallet, map: selectedMap })
                });
            })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    students.push({ wallet: studentWallet, name: data.user?.name || "Unknown" });
                    updateStudentList();
                    loadingOverlay.classList.remove("active");
                    alert(`Student added and map ${selectedMap.name} assigned successfully!`);
                } else {
                    throw new Error(data.message || "Failed to assign map to student.");
                }
            })
            .catch(error => {
                console.error("Error adding student:", error);
                loadingOverlay.classList.remove("active");
                alert(`Error: ${error.message}`);
            });
    }

    document.querySelector(".new-class-btn").addEventListener("click", () => {
        const randomMapImage = mapImages[Math.floor(Math.random() * mapImages.length)];
        mapPreview.src = randomMapImage;
        classTitleInput.value = "";
        newClassModal.show();
    });

    saveClassBtn.addEventListener("click", () => {
        const subjectName = classTitleInput.value.trim();
        if (!subjectName) {
            alert("Please enter a subject name.");
            return;
        }

        const newMapId = Date.now() + Math.floor(Math.random() * 1000); // Unique ID
        const newMap = {
            id: newMapId,
            name: subjectName,
            description: `Explore ${subjectName} concepts.`,
            image: mapPreview.src
        };

        loadingOverlay.classList.add("active");
        loadingMessage.textContent = "Saving Class...";

        fetch(`/maps/${walletAddress}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newMap)
        })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.success) {
                maps.push(newMap);
                displayMaps(maps);
                newClassModal.hide();
            } else {
                alert("Failed to save class: " + (data.message || "Unknown error"));
            }
            loadingOverlay.classList.remove("active");
        })
        .catch(error => {
            console.error("Error saving class:", error);
            alert("Failed to save class. Please try again later.");
            loadingOverlay.classList.remove("active");
        });
    });

    loadMaps();
});