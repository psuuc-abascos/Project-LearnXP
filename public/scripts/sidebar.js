document.addEventListener("DOMContentLoaded", () => {
    const sidebarTemplate = document.getElementById("sidebar-template");
    const sidebarContainer = document.getElementById("sidebar-container");
    const userRole = localStorage.getItem("selectedRole") || "student"; // Use "selectedRole" as set by connectWallet.js

    if (sidebarTemplate && sidebarContainer) {
        const sidebarClone = document.importNode(sidebarTemplate.content, true);
        const navList = sidebarClone.querySelector("#sidebar-nav");

        // Define navigation items based on role
        const studentNav = `
            <div class="active-indicator"></div>
            <li class="nav-item"><a class="nav-link" href="dashboard.html"><i class="bi bi-house-door"></i> Home</a></li>
            <li class="nav-item"><a class="nav-link" href="character.html" id="myCharacterLink"><i class="bi bi-person"></i> My Character</a></li>
            <li class="nav-item"><a class="nav-link" href="quest.html"><i class="bi bi-trophy"></i> Quests</a></li>
            <li class="nav-item"><a class="nav-link" href="#"><i class="bi bi-bar-chart"></i> Leaderboards</a></li>
            <li class="nav-item"><a class="nav-link" href="#"><i class="bi bi-shop"></i> Marketplace</a></li>
            <li class="nav-item"><a class="nav-link" href="#"><i class="bi bi-gear"></i> Settings</a></li>
            <li class="nav-item"><a class="nav-link" href="#" id="logoutLink"><i class="bi bi-box-arrow-right"></i> Logout</a></li>
        `;

        const teacherNav = `
            <div class="active-indicator"></div>
            <li class="nav-item"><a class="nav-link" href="dashboard.html"><i class="bi bi-house-door"></i> Home</a></li>
            <li class="nav-item"><a class="nav-link" href="class-dashboard.html"><i class="bi bi-easel"></i> Class Dashboard</a></li>
            <li class="nav-item"><a class="nav-link" href="class-tools.html"><i class="bi bi-tools"></i> Class Tools</a></li>
            <li class="nav-item"><a class="nav-link" href="quest.html"><i class="bi bi-trophy"></i> Quests</a></li>
            <li class="nav-item"><a class="nav-link" href="#"><i class="bi bi-bar-chart"></i> Leaderboards</a></li>
            <li class="nav-item"><a class="nav-link" href="#"><i class="bi bi-gear"></i> Settings</a></li>
            <li class="nav-item"><a class="nav-link" href="#" id="logoutLink"><i class="bi bi-box-arrow-right"></i> Logout</a></li>
        `;

        // Inject navigation based on role
        navList.innerHTML = userRole === "Teacher" ? teacherNav : studentNav;
        sidebarContainer.appendChild(sidebarClone);
    } else {
        console.error("Sidebar template or container not found");
    }

    // DOM elements
    const sidebar = document.querySelector(".sidebar");
    const mainContent = document.querySelector(".main-content");
    const hamburgerMenu = document.getElementById("hamburgerMenu");
    const logoutLink = document.getElementById("logoutLink");
    const logoutConfirm = document.getElementById("logoutConfirm");
    const confirmLogout = document.getElementById("confirmLogout");
    const cancelLogout = document.getElementById("cancelLogout");
    const navLinks = document.querySelectorAll(".nav-link");
    const activeIndicator = document.querySelector(".active-indicator");

    const restrictedPages = ['register.html', 'connect-wallet.html', 'index.html'];

    // Icon swap logic
    function updateHamburgerIcon() {
        if (sidebar && sidebar.classList.contains("hidden")) {
            hamburgerMenu.innerHTML = '<i class="bi bi-list"></i>';
        } else if (sidebar) {
            hamburgerMenu.innerHTML = '<i class="bi bi-x"></i>';
        }
    }

    // Update active link and indicator
    function updateActiveState() {
        const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
        let activeLink = null;

        navLinks.forEach(link => {
            const href = link.getAttribute("href");
            link.classList.remove("active");
            if (href && href === currentPath) {
                link.classList.add("active");
                activeLink = link;
            }
        });

        if (activeLink && activeIndicator) {
            const linkOffsetTop = activeLink.offsetTop;
            activeIndicator.style.transform = `translateY(${linkOffsetTop}px)`;
            activeIndicator.style.display = 'block';
            requestAnimationFrame(() => {
                activeIndicator.style.transform = `translateY(${linkOffsetTop}px)`;
            });
        } else if (activeIndicator) {
            activeIndicator.style.display = 'none';
        }
    }

    // Initial setup
    updateHamburgerIcon();
    updateActiveState();

    // Hamburger menu toggle
    hamburgerMenu?.addEventListener("click", () => {
        sidebar?.classList.toggle("hidden");
        mainContent?.classList.toggle("shifted");
        hamburgerMenu?.classList.toggle("active");
        updateHamburgerIcon();
    });

    // Logout confirmation
    logoutLink?.addEventListener("click", (e) => {
        e.preventDefault();
        if (logoutConfirm) logoutConfirm.style.display = "block";
    });

    confirmLogout?.addEventListener("click", () => {
        // Clear all localStorage data, as the backend handles persistence
        localStorage.clear();
        window.location.href = "index.html";
    });

    cancelLogout?.addEventListener("click", () => {
        if (logoutConfirm) logoutConfirm.style.display = "none";
    });

    // Navigation click handler
    navLinks.forEach(link => {
        if (link.getAttribute("onclick")) return;
        link.addEventListener("click", (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");
            if (activeIndicator) {
                const linkOffsetTop = link.offsetTop;
                activeIndicator.style.transform = `translateY(${linkOffsetTop}px)`;
            }
            const href = link.getAttribute("href");
            if (href && href !== "#") {
                window.location.href = href;
            }
        });
    });

    // Handle back/forward navigation
    window.addEventListener("popstate", (event) => {
        const newPath = window.location.pathname.split('/').pop() || 'dashboard.html';
        if (restrictedPages.includes(newPath)) {
            if (logoutConfirm) logoutConfirm.style.display = "block";
            history.pushState(null, null, document.location.href);
        } else {
            updateActiveState();
        }
    });

    // Handle cached pages
    window.addEventListener("pageshow", (event) => {
        if (event.persisted) {
            updateActiveState();
        }
    });

    // Prevent back navigation to restricted pages on initial load
    history.pushState(null, null, document.location.href);
});