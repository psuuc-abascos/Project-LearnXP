document.addEventListener("DOMContentLoaded", () => {
    const walletAddress = localStorage.getItem("walletAddress");
    console.log("Wallet Address:", walletAddress); // Debug wallet address
    const selectedCharacter = localStorage.getItem("selectedCharacter");
    const role = localStorage.getItem("selectedRole");
    const loadingOverlay = document.getElementById("loadingOverlay");
    const loadingMessage = document.getElementById("loadingMessage");

    if (!walletAddress || !role) {
        window.location.href = "index.html";
        return;
    }

    const defaultCharacters = [
        { id: "NFT143", imgSrc: "https://imageio.forbes.com/specials-images/imageserve/6170e01f8d7639b95a7f2eeb/Sotheby-s-NFT-Natively-Digital-1-2-sale-Bored-Ape-Yacht-Club--8817-by-Yuga-Labs/0x0.png?format=png&width=1440", description: "" },
        { id: "NFT256", imgSrc: "https://miro.medium.com/v2/resize:fit:685/1*cr-kaaQHL6aV_nFJ7_oqmg.jpeg", description: "" },
        { id: "NFT168", imgSrc: "https://img.freepik.com/free-vector/hand-drawn-nft-style-ape-illustration_23-2149622021.jpg", description: "" }
    ];

    // Fetch user data
    fetch(`/user/${walletAddress}`)
        .then(response => response.json())
        .then(data => {
            if (data.user) {
                const userName = data.user.name || "Unknown User";
                const userEmail = localStorage.getItem("userEmail") || data.user.email;
                const level = data.user.levels ? data.user.levels[0]?.power || 0 : 0;
                const hp = data.user.hp || 100;
                const xp = data.user.xp || 0;
                let customDescription = data.user.customDescription || "";

                // Update the character profile title dynamically
                const profileTitle = document.querySelector(".character-profile-title");
                profileTitle.textContent = `${userName}'s Profile`;

                document.getElementById("characterName").textContent = userName;
                document.getElementById("characterLevel").textContent = level;
                document.getElementById("characterHP").textContent = `${hp} HP`;
                document.getElementById("characterHPBar").style.width = `${(hp / 100) * 100}%`;
                document.getElementById("characterXP").textContent = `${xp} XP`;
                document.getElementById("characterXPBar").style.width = `${(xp / 500) * 100}%`;

                const character = defaultCharacters.find(c => c.id === selectedCharacter) || defaultCharacters[2];
                const description = customDescription || "Add Bio"; // Show "Add Bio" if customDescription is empty
                document.getElementById("characterDescription").textContent = description;
                document.getElementById("characterImg").src = character.imgSrc;
            } else {
                window.location.href = "register.html";
            }
        })
        .catch(error => {
            console.error("Fetch Error:", error);
            const profileTitle = document.querySelector(".character-profile-title");
            profileTitle.textContent = "Unknown User's Profile"; // Fallback title
            document.getElementById("characterName").textContent = "Unknown User";
            document.getElementById("characterLevel").textContent = 0;
            document.getElementById("characterHP").textContent = "100 HP";
            document.getElementById("characterHPBar").style.width = "100%";
            document.getElementById("characterXP").textContent = "0 XP";
            document.getElementById("characterXPBar").style.width = "0%";
            const character = defaultCharacters.find(c => c.id === selectedCharacter) || defaultCharacters[2];
            document.getElementById("characterDescription").textContent = "Add Bio"; // Default to "Add Bio" on error
            document.getElementById("characterImg").src = character.imgSrc;
            alert("Failed to load user data. Please try again or register.");
        });

    // Debugging badge image loading
    const badgeImages = document.querySelectorAll('.badge');
    badgeImages.forEach(img => {
        img.addEventListener('error', () => {
            console.error(`Failed to load image: ${img.src}`);
        });
        img.addEventListener('load', () => {
            console.log(`Successfully loaded image: ${img.src}`);
        });
    });

    // Editable description functionality
    const descriptionContainer = document.getElementById('characterDescriptionContainer');
    const descriptionText = document.getElementById('characterDescription');
    const editButton = document.getElementById('editDescriptionBtn');

    let originalDescription = descriptionText.textContent;

    editButton.addEventListener('click', () => {
        originalDescription = descriptionText.textContent;

        // Create textarea with current description
        const textarea = document.createElement('textarea');
        textarea.className = 'description-textarea';
        textarea.value = originalDescription === "Add Bio" ? "" : originalDescription; // Start with empty if "Add Bio"
        textarea.rows = 3;

        // Create save and cancel buttons
        const saveButton = document.createElement('button');
        saveButton.className = 'save-button';
        saveButton.textContent = 'Save';

        const cancelButton = document.createElement('button');
        cancelButton.className = 'cancel-button';
        cancelButton.textContent = 'Cancel';

        // Replace the description and edit button with textarea and buttons
        descriptionContainer.innerHTML = '';
        descriptionContainer.appendChild(textarea);
        descriptionContainer.appendChild(saveButton);
        descriptionContainer.appendChild(cancelButton);

        // Focus the textarea
        textarea.focus();

        // Attach event listeners directly to the buttons
        saveButton.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default form submission or reload
            const newDescription = textarea.value.trim();

            if (newDescription) {
                console.log("Save clicked, new description:", newDescription);
                console.log("Wallet Address for PUT:", walletAddress); // Debug wallet
                loadingOverlay.classList.add('active');
                loadingMessage.textContent = 'Saving...';

                fetch(`/user/${walletAddress}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customDescription: newDescription })
                })
                .then(response => {
                    console.log("Fetch response status:", response.status); // Debug status
                    return response.json();
                })
                .then(putResponse => {
                    console.log("PUT Response:", putResponse);
                    loadingOverlay.classList.remove('active');
                    if (putResponse.success) {
                        // Update the original description and UI
                        originalDescription = newDescription; // Update state
                        descriptionText.textContent = newDescription; // Update UI
                        revertToDisplayMode(newDescription); // Use new description in DOM
                        console.log("Description updated in UI:", descriptionText.textContent);
                    } else {
                        console.error("Server reported failure:", putResponse.message);
                        descriptionText.textContent = newDescription; // Fallback update
                        revertToDisplayMode(newDescription); // Use fallback in DOM
                        alert("Save failed on server, using local update: " + (putResponse.message || "Unknown error"));
                    }
                })
                .catch(error => {
                    loadingOverlay.classList.remove('active');
                    loadingMessage.textContent = 'Save failed: ' + (error.message || 'Network error');
                    loadingOverlay.classList.add('active');
                    descriptionText.textContent = newDescription; // Fallback update
                    revertToDisplayMode(newDescription); // Use fallback in DOM
                    console.error("Error saving description:", error);
                    alert("Network error, using local update: " + error.message);
                });
            } else {
                // If no new description, revert to "Add Bio" or original
                revertToDisplayMode(originalDescription === "Add Bio" ? "Add Bio" : originalDescription);
            }
        });

        cancelButton.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default action
            revertToDisplayMode(originalDescription);
        });
    });

    // Helper function to revert to display mode
    function revertToDisplayMode(content = originalDescription) {
        descriptionContainer.innerHTML = '';
        const descriptionElement = document.createElement('p');
        descriptionElement.id = 'characterDescription';
        descriptionElement.textContent = content === "" ? "Add Bio" : content; // Show "Add Bio" if empty
        descriptionContainer.appendChild(descriptionElement);
        descriptionContainer.appendChild(editButton);
    }

    document.getElementById("confirmLogout").addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "index.html";
    });

    document.getElementById("cancelLogout").addEventListener("click", () => {
        document.getElementById("logoutConfirm").style.display = "none";
    });

    document.getElementById("logoutLink").addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("logoutConfirm").style.display = "block";
    });

    document.getElementById('hamburgerMenu').addEventListener('click', function() {
        document.body.classList.toggle('sidebar-closed');
    });
});