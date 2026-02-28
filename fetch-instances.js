const EVO_API_URL = "https://evolution-api-production-9ac1.up.railway.app";
const EVO_API_KEY = "Lueed28@13546289b@P@ssw0rd";

async function fetchAll() {
    try {
        console.log("Fetching instances...");
        const res = await fetch(`${EVO_API_URL}/instance/fetchInstances`, {
            method: "GET",
            headers: {
                "apikey": EVO_API_KEY,
                "globalApiKey": EVO_API_KEY,
                "Authorization": `Bearer ${EVO_API_KEY}`
            }
        });
        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(`Body: ${text}`);
    } catch(e) { console.error("Error", e); }
}
fetchAll();
