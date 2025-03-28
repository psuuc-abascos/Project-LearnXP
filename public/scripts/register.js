// register.js
document.addEventListener("DOMContentLoaded", () => {
    const walletAddress = localStorage.getItem("walletAddress");
    const role = localStorage.getItem("selectedRole");
    const loadingOverlay = document.getElementById("loadingOverlay");

    if (!walletAddress || !role) {
        window.location.href = "index.html";
        return;
    }

    fetch(`/user/${walletAddress}`)
        .then(response => response.json())
        .then(data => {
            if (data.user && data.user.email) {
                window.location.href = "dashboard.html";
            }
        })
        .catch(error => console.error("Error checking user:", error));

    const registerForm = document.getElementById("registerForm");
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value;
        const name = document.getElementById("name").value;
        const phone = document.getElementById("phone").value;
        const password = document.getElementById("password").value;

        if (!email || !name || !phone || !password) {
            loadingOverlay.classList.add("active", "error");
            document.querySelector(".loading-message").textContent = "Please fill in all fields";
            setTimeout(() => loadingOverlay.classList.remove("active", "error"), 2000);
            return;
        }

        try {
            loadingOverlay.classList.add("active");

            const registerResponse = await fetch("/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    wallet: walletAddress,
                    role: role,
                    email: email,
                    name: name,
                    phone: phone,
                    password: password
                })
            });
            const registerData = await registerResponse.json();

            if (registerData.message === "Registration successful!") {
                const validCharacters = ["NFT143", "NFT256", "NFT168"];
                let assignedCharacter;

                const characterResponse = await fetch("/set-character", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ wallet: walletAddress })
                });
                const characterData = await characterResponse.json();

                if (characterData.character && validCharacters.includes(characterData.character)) {
                    assignedCharacter = characterData.character;
                } else {
                    assignedCharacter = validCharacters[Math.floor(Math.random() * validCharacters.length)];
                }

                console.log("Assigned Character:", assignedCharacter);
                localStorage.setItem("selectedCharacter", assignedCharacter);
                localStorage.setItem("registrationComplete", "true");
                localStorage.setItem("modalShown", "false");
                localStorage.setItem("userEmail", email);
                localStorage.setItem("userRole", role); // Store the role

                loadingOverlay.classList.add("success");
                setTimeout(() => {
                    loadingOverlay.classList.remove("active", "success");
                    window.location.href = "dashboard.html";
                }, 2000);
            } else {
                loadingOverlay.classList.add("error");
                document.querySelector(".loading-message").textContent = registerData.message;
                setTimeout(() => loadingOverlay.classList.remove("active", "error"), 2000);
            }
        } catch (error) {
            console.error("Error:", error);
            loadingOverlay.classList.add("error");
            document.querySelector(".loading-message").textContent = "Registration failed";
            setTimeout(() => loadingOverlay.classList.remove("active", "error"), 2000);
        }
    });
});