document.addEventListener("DOMContentLoaded", () => {
    const walletAddress = localStorage.getItem("walletAddress");
    const role = localStorage.getItem("selectedRole");

    if (!walletAddress || !role) {
        window.location.href = "index.html";
        return;
    }

    const characters = [
        { id: "NFT143", imgSrc: "https://imageio.forbes.com/specials-images/imageserve/6170e01f8d7639b95a7f2eeb/Sotheby-s-NFT-Natively-Digital-1-2-sale-Bored-Ape-Yacht-Club--8817-by-Yuga-Labs/0x0.png?format=png&width=1440", description: "A fierce warrior from the Bored Ape tribe." },
        { id: "NFT256", imgSrc: "https://miro.medium.com/v2/resize:fit:685/1*cr-kaaQHL6aV_nFJ7_oqmg.jpeg", description: "A mystical mage with powerful spells." },
        { id: "NFT168", imgSrc: "https://img.freepik.com/free-vector/hand-drawn-nft-style-ape-illustration_23-2149622021.jpg", description: "A skilled archer with deadly precision." }
    ];

    let selectedCharacter = localStorage.getItem("selectedCharacter");
    if (!selectedCharacter || !characters.some(c => c.id === selectedCharacter)) {
        selectedCharacter = characters[Math.floor(Math.random() * characters.length)].id;
        localStorage.setItem("selectedCharacter", selectedCharacter);
        localStorage.setItem("registrationComplete", "true");
        localStorage.setItem("modalShown", "false");
    }

    const characterModal = new bootstrap.Modal(document.getElementById("characterModal"), { backdrop: "static", keyboard: false });
    const modalImage = document.getElementById("modalImage");
    const modalTitle = document.getElementById("modalTitle");
    const modalDescription = document.getElementById("modalDescription");
    const modalLevelsInner = document.getElementById("modalLevelsInner");
    const confirmButton = document.getElementById("confirmButton");

    const isRegistrationComplete = localStorage.getItem("registrationComplete") === "true";
    const isModalShown = localStorage.getItem("modalShown") === "true";

    fetch(`/user/${walletAddress}`)
        .then(response => response.json())
        .then(data => {
            if (data.user) {
                if (data.user.role !== role) localStorage.setItem("selectedRole", data.user.role);
                if (isRegistrationComplete && !isModalShown) {
                    showCharacterModal(selectedCharacter, data.user.levels);
                    localStorage.setItem("modalShown", "true");
                }
            } else {
                window.location.href = "register.html";
            }
        })
        .catch(error => {
            console.error("Fetch Error:", error);
            mainContent.innerHTML = "<p>Error loading dashboard. Please try again.</p>";
        });

    function showCharacterModal(characterId, levels = null) {
        const character = characters.find(c => c.id === characterId);
        if (character) {
            modalImage.src = character.imgSrc;
            modalTitle.textContent = character.id;
            modalDescription.textContent = character.description;

            modalLevelsInner.innerHTML = "";
            const userLevels = levels || Array.from({ length: 10 }, (_, i) => ({ power: (i + 1) * 10 }));
            userLevels.forEach((level, i) => {
                const levelBox = document.createElement("div");
                levelBox.className = "level-box";
                levelBox.innerHTML = `
                    <img src="/icons/level${i + 1}.png" class="level-icon" alt="Power ${level.power}">
                    <span class="level-text">Power ${level.power}</span>
                `;
                modalLevelsInner.appendChild(levelBox);
            });
            characterModal.show();
        }
    }

    document.getElementById("myCharacterLink").addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "character.html";
    });

    confirmButton.addEventListener("click", () => characterModal.hide());
});

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}