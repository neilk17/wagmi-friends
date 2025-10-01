const { app, Tray, Menu, nativeImage, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// --- 🔹 CONFIG ---
const SUPABASE_URL = "https://eovplgtqlqrlwvhkukic.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvdnBsZ3RxbHFybHd2aGt1a2ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMTM4NDMsImV4cCI6MjA3NDg4OTg0M30.KJMIKGZILtUMAcvyRaJOGaaPa3HvS4Qbl5MjrydkK-k"

const CONFIG_FILE = path.join(app.getPath('userData'), 'user-config.json')

// User data
let myName = null
let myId = null // Will be set after first insert
let myStatus = "cooking" // Track current status locally

let tray
let supabase

// --- 🔹 User Config Management ---
function loadUserConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
            myName = data.name
            myId = data.id || null
            return true
        }
    } catch (error) {
        console.error("Failed to load config:", error)
    }
    return false
}

function saveUserConfig() {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({ name: myName, id: myId }))
    } catch (error) {
        console.error("Failed to save config:", error)
    }
}

async function promptForName() {
    const { exec } = require('child_process')
    return new Promise((resolve) => {
        const script = `osascript -e 'Tell application "System Events" to display dialog "What is your name?" default answer "" with title "Wagmi Friends"' -e 'text returned of result'`
        exec(script, (error, stdout, stderr) => {
            if (error || !stdout.trim()) {
                resolve(null)
            } else {
                resolve(stdout.trim())
            }
        })
    })
}

// --- 🔹 Supabase Init ---
function initSupabase() {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Subscribe to changes
    supabase
        .channel('online-friends')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' },
            payload => {
                console.log("Realtime change:", payload)
                refreshMenu()
            })
        .subscribe()
}

// --- 🔹 Heartbeat ---
async function heartbeat(status = "cooking") {
    myStatus = status // Update local status immediately
    if (myId) {
        // Update existing user
        const { error } = await supabase.from('users').update({
            status,
            updated_at: new Date()
        }).eq('id', myId)
        if (error) console.error("Heartbeat failed:", error)
    } else {
        // Insert new user and get the generated id
        const { data, error } = await supabase.from('users').insert({
            name: myName,
            status,
            updated_at: new Date()
        }).select('id').single()

        if (error) {
            console.error("Heartbeat failed:", error)
        } else {
            myId = data.id
            console.log("My ID:", myId)
            saveUserConfig() // Save the ID for next time
        }
    }
}

// --- 🔹 Fetch Online Users ---
async function getOnlineFriends() {
    const { data, error } = await supabase
        .from('users')
        .select('id, name, status, updated_at')
        .gte('updated_at', new Date(Date.now() - 2 * 60 * 1000).toISOString())

    if (error) {
        console.error("Fetch failed:", error)
        return []
    }
    return data
}

// --- 🔹 Refresh Tray Menu ---
async function refreshMenu() {
    const friends = await getOnlineFriends()
    const contextMenu = Menu.buildFromTemplate([
        { label: "Friends Online", enabled: false },
        ...friends.map(f => ({
            label: `${f.name || 'User #' + f.id} (${f.id === myId ? myStatus : f.status})`
        })),
        { type: 'separator' },
        { label: "Set me Cooking", click: async () => { await heartbeat("cooking"); await refreshMenu(); } },
        { label: "Set me Idle", click: async () => { await heartbeat("idle"); await refreshMenu(); } },
        { type: 'separator' },
        { role: 'quit' }
    ])
    tray.setContextMenu(contextMenu)
}

// --- 🔹 App Lifecycle ---
// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
    app.quit()
    return
}

app.whenReady().then(async () => {
    tray = new Tray(nativeImage.createEmpty()) // Empty image
    tray.setTitle("🍳") // Set emoji as title
    tray.setToolTip("Friends Status")

    // Check if user exists
    if (!loadUserConfig()) {
        // First time user - prompt for name
        myName = await promptForName()
        if (!myName) {
            console.log("No name provided, exiting")
            app.quit()
            return
        }
        saveUserConfig()
    }

    initSupabase()
    heartbeat()
    refreshMenu()

    // Heartbeat every 30 sec
    setInterval(() => heartbeat(), 30_000)
    // Refresh menu every 1 min as fallback
    setInterval(refreshMenu, 60_000)
})
