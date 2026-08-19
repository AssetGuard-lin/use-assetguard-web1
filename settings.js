// settings.js

let _db;
let _profilePath;
let _userProfile;
let _currentUID;

// Initialize settings dependencies
export function initSettings(db, profilePath, userProfile, currentUID) {
    _db = db;
    _profilePath = profilePath;
    _userProfile = userProfile;
    _currentUID = currentUID;
}

export function openSettings() {
    let p = _userProfile;
    try {
        p = JSON.parse(localStorage.getItem(`ag_profile_cache_${_currentUID}`)) || _userProfile;
    } catch (error) {
        AGErrors.report("settings profile cache parsing", error);
    }
    document.getElementById('set-business-name').value = p.businessName || "";
    document.getElementById('set-business-tagline').value = p.tagline || "";
    document.getElementById('settingsModal').style.display = 'flex';
}

export async function saveSettings() {
    const { set, ref } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js");
    const name = document.getElementById('set-business-name').value;
    const tag = document.getElementById('set-business-tagline').value;
    
    try {
        await set(ref(_db, _profilePath), { businessName: name, tagline: tag });
    } catch (error) {
        AGErrors.report("profile settings save", error, message => alert(`Profile save failed: ${message}`));
        return;
    }
    
    // Update local cache
    const updatedProfile = { businessName: name, tagline: tag };
    localStorage.setItem(`ag_profile_cache_${_currentUID}`, JSON.stringify(updatedProfile));
    
    document.getElementById('settingsModal').style.display = 'none';
    alert("Profile Updated Successfully");
}
