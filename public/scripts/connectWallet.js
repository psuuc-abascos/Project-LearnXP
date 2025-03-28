let connectedAccount = "";

document.addEventListener("DOMContentLoaded", () => {
    const mainContent = document.getElementById("mainContent");
    const roleSelection = document.getElementById("roleSelection");
    const connectBtn = document.getElementById("connectWallet");
    const loadingOverlay = document.getElementById("loadingOverlay");

    // Ensure role selection is hidden by default
    roleSelection.style.display = "none";

    connectBtn.addEventListener("click", async () => {
        if (!window.ethereum) {
            alert("MetaMask not found. Please install it.");
            return;
        }

        try {
            loadingOverlay.classList.add("active");
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            connectedAccount = accounts[0];
            localStorage.setItem("walletAddress", connectedAccount);

            loadingOverlay.classList.add("success");
            await new Promise(resolve => setTimeout(resolve, 2000));
            loadingOverlay.classList.remove("success", "active");

            connectBtn.classList.remove("connect-btn");
            connectBtn.classList.add("connected-btn");
            connectBtn.textContent = "Connected";

            const response = await fetch(`/get-role/${connectedAccount}`);
            if (!response.ok) throw new Error("Failed to fetch role");
            const data = await response.json();

            if (data.role) {
                localStorage.setItem("selectedRole", data.role);
                const userResponse = await fetch(`/user/${connectedAccount}`);
                const userData = await userResponse.json();

                if (userData.user && userData.user.email) {
                    localStorage.setItem("selectedCharacter", userData.user.character);
                    window.location.href = "dashboard.html";
                } else {
                    window.location.href = "register.html";
                }
            } else {
                showRoleSelection();
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Failed to connect wallet or fetch role.");
            loadingOverlay.classList.remove("active");
        }
    });
});

// Function to smoothly show role selection floating container
function showRoleSelection() {
    const mainContent = document.getElementById("mainContent");
    const roleSelection = document.getElementById("roleSelection");

    // Instead of hiding, fade out and blur the background
    mainContent.style.opacity = "0.2";
    mainContent.style.filter = "blur(5px)";

    setTimeout(() => {
        roleSelection.style.display = "block";
        setTimeout(() => {
            roleSelection.classList.add("active");
        }, 50);
    }, 300);
}

// Function to handle role selection
function selectRole(role) {
    localStorage.setItem("selectedRole", role);
    localStorage.setItem("walletAddress", connectedAccount);
    // Check if the user already has data to determine if maps should be cleared
    fetch(`/user/${connectedAccount}`)
        .then(response => response.json())
        .then(userData => {
            // Only clear maps if the user is new (no user data exists)
            if (!userData.user || !userData.user.email) {
                // Clear maps in localStorage
                localStorage.removeItem(`maps_${connectedAccount}`);
                // Clear maps on the backend
                fetch(`/maps/${connectedAccount}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" }
                })
                .then(response => {
                    if (!response.ok) throw new Error("Failed to clear maps on backend");
                    window.location.href = "register.html";
                })
                .catch(error => {
                    console.error("Error clearing maps on backend:", error);
                    window.location.href = "register.html";
                });
            } else {
                window.location.href = "register.html";
            }
        })
        .catch(error => {
            console.error("Error checking user data:", error);
            // If there's an error, assume the user is new and clear maps
            localStorage.removeItem(`maps_${connectedAccount}`);
            fetch(`/maps/${connectedAccount}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            })
            .then(response => {
                if (!response.ok) throw new Error("Failed to clear maps on backend");
                window.location.href = "register.html";
            })
            .catch(error => {
                console.error("Error clearing maps on backend:", error);
                window.location.href = "register.html";
            });
        });
}