const bcrypt = require("bcryptjs");

// Store user data in memory (replace with a database for persistence)
const users = {};

const getHomePage = (req, res) => {
    res.sendFile(path.join(__dirname, "../public", "index.html"));
};

const getRole = (req, res) => {
    const { wallet } = req.params;
    if (users[wallet]) {
        res.json({ role: users[wallet].role || null });
    } else {
        res.json({ role: null });
    }
};

const setRole = (req, res) => {
    const { wallet, role } = req.body;

    if (!wallet || !role) {
        return res.status(400).json({ message: "Wallet address and role are required." });
    }

    if (users[wallet]) {
        return res.status(403).json({ message: "Role already assigned. You cannot change it." });
    }

    users[wallet] = { role };
    console.log(`Wallet: ${wallet} set as ${role}`);
    res.json({ message: `Role set to ${role} for wallet ${wallet}` });
};

const registerUser = async (req, res) => {
    const { wallet, role, email, name, phone, password } = req.body;

    if (!wallet || !role || !email || !name || !phone || !password) {
        return res.status(400).json({ message: "All fields are required." });
    }

    if (users[wallet] && users[wallet].email) {
        return res.status(400).json({ message: "User already registered with this wallet." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    users[wallet] = {
        ...users[wallet],
        role: role,
        email: email,
        name: name,
        phone: phone,
        password: hashedPassword,
        customDescription: "",
        maps: [] // Initialize maps array for each user
    }; 
    console.log(`User registered: Wallet: ${wallet}, Role: ${role}, Name: ${name}`);
    res.json({ message: "Registration successful!" });
};

const getUser = (req, res) => {
    const wallet = req.params.wallet;
    if (users[wallet]) {
        return res.json({
            user: {
                role: users[wallet].role || null,
                email: users[wallet].email || null,
                name: users[wallet].name || "Unknown User",
                phone: users[wallet].phone || null,
                password: users[wallet].password || null,
                character: users[wallet].character || null,
                levels: users[wallet].levels || [{ power: 0 }],
                hp: users[wallet].hp || 100,
                xp: users[wallet].xp || 0,
                customDescription: users[wallet].customDescription || ""
            }
        });
    } else {
        return res.json({ user: null });
    }
};

const setCharacter = (req, res) => {
    const { wallet, character } = req.body;

    if (!wallet) {
        return res.status(400).json({ message: "Wallet is required." });
    }

    if (users[wallet] && users[wallet].character) {
        return res.status(403).json({ message: "Character already assigned to this account." });
    }

    const characters = ["NFT143", "NFT256", "NFT168"];
    const assignedCharacter = character || characters[Math.floor(Math.random() * characters.length)];

    users[wallet] = {
        ...users[wallet],
        character: assignedCharacter
    };
    console.log(`Character ${assignedCharacter} assigned to wallet: ${wallet}`);
    res.json({ message: `Character ${assignedCharacter} assigned successfully`, character: assignedCharacter });
};

const updateUser = (req, res) => {
    const wallet = req.params.wallet;
    const { customDescription } = req.body;

    if (!wallet) {
        return res.status(400).json({ message: "Wallet is required." });
    }

    if (!users[wallet]) {
        return res.status(404).json({ message: "User not found." });
    }

    users[wallet] = {
        ...users[wallet],
        customDescription: customDescription || ""
    };

    console.log(`Updated customDescription for wallet ${wallet}: ${customDescription}`);
    res.json({ success: true, user: users[wallet] });
};

const getMaps = (req, res) => {
    const wallet = req.params.wallet;
    if (!users[wallet]) {
        return res.status(404).json({ message: "User not found" });
    }

    const userMaps = users[wallet].maps || [];
    res.json({ maps: userMaps });
};

const saveMap = (req, res) => {
    const wallet = req.params.wallet;
    const { id, name, description, image } = req.body;

    if (!users[wallet]) {
        return res.status(404).json({ message: "User not found" });
    }

    if (!id || !name || !description || !image) {
        return res.status(400).json({ message: "All map fields (id, name, description, image) are required" });
    }

    users[wallet].maps = users[wallet].maps || [];
    const existingMap = users[wallet].maps.find(map => map.id === id);
    if (existingMap) {
        return res.status(400).json({ message: "Map with this ID already exists" });
    }

    const newMap = { id, name, description, image };
    users[wallet].maps.push(newMap);
    console.log(`Map added for wallet ${wallet}: ${name}`);
    res.json({ success: true, map: newMap });
};

// New endpoint to assign a map to a student
const assignMapToStudent = (req, res) => {
    const { studentWallet, map } = req.body;

    if (!studentWallet || !map || !map.id || !map.name || !map.description || !map.image) {
        return res.status(400).json({ message: "Student wallet and complete map data are required" });
    }

    if (!users[studentWallet]) {
        return res.status(404).json({ message: "Student not found" });
    }

    users[studentWallet].maps = users[studentWallet].maps || [];
    const existingMap = users[studentWallet].maps.find(m => m.id === map.id);
    if (existingMap) {
        return res.status(400).json({ message: "Map already assigned to this student" });
    }

    users[studentWallet].maps.push(map);
    console.log(`Map ${map.name} assigned to student wallet ${studentWallet}`);
    res.json({ success: true, message: `Map ${map.name} assigned to student ${studentWallet}` });
};

const getQuests = (req, res) => {
    const wallet = req.params.wallet;
    const mapId = parseInt(req.params.mapId);
    if (!users[wallet]) {
        return res.status(404).json({ message: "User not found" });
    }

    const userProgress = users[wallet].questProgress || {};
    res.json({ quests: [], progress: userProgress }); // Quests can be dynamic later
};

const startQuest = (req, res) => {
    const wallet = req.params.wallet;
    const { questId } = req.body;

    if (!users[wallet]) {
        return res.status(404).json({ message: "User not found" });
    }

    const allQuests = [
        { id: 1, title: "Solve Equations", xp: 30 },
        { id: 2, title: "Graph Basics", xp: 50 },
        { id: 3, title: "Science Experiment", xp: 40 },
        { id: 4, title: "Physics Challenge", xp: 60 },
        { id: 5, title: "Filipino Story", xp: 70 },
        { id: 6, title: "Language Quiz", xp: 80 },
        { id: 7, title: "Art Project", xp: 50 },
        { id: 8, title: "PE Challenge", xp: 60 },
        { id: 9, title: "Code Basics", xp: 70 },
        { id: 10, title: "Tech Quiz", xp: 80 },
        { id: 11, title: "Grammar Test", xp: 40 },
        { id: 12, title: "Essay Writing", xp: 60 }
    ];
    const quest = allQuests.find(q => q.id === questId);

    if (!quest) {
        return res.status(400).json({ message: "Invalid quest ID" });
    }

    users[wallet].questProgress = users[wallet].questProgress || {};
    if (!users[wallet].questProgress[questId]) {
        users[wallet].questProgress[questId] = { status: "in_progress", completion: 0 };
    }

    res.json({ success: true, quest });
};

module.exports = {
    getHomePage,
    getRole,
    setRole,
    registerUser,
    getUser,
    setCharacter,
    updateUser,
    getMaps,
    saveMap,
    assignMapToStudent, // New export
    getQuests,
    startQuest
};