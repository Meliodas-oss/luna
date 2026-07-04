let map = L.map('map').setView([50.11, 8.68], 13);

// DARK TILE (Google-like)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{
    maxZoom: 20
}).addTo(map);

let userMarker = null;
let targetMarker = null;
let routeLine = null;

let user = null;
let target = null;

let driveMode = false;
let batteryMode = false;

let lastRouteTime = 0;

let state = {lat:0,lng:0,init:false};

function smooth(lat,lng){
    if(!state.init){
        state.lat = lat;
        state.lng = lng;
        state.init = true;
    }

    state.lat = state.lat * 0.85 + lat * 0.15;
    state.lng = state.lng * 0.85 + lng * 0.15;

    return {lat:state.lat,lng:state.lng};
}

/* CLICK → TARGET */
map.on("click", e=>{
    target = e.latlng;

    if(targetMarker) map.removeLayer(targetMarker);

    targetMarker = L.marker([target.lat, target.lng]).addTo(map);

    speak("Ziel gesetzt");
    updateRoute(true);
});

/* GPS */
function startGPS(){

    navigator.geolocation.watchPosition(pos=>{

        let raw = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: pos.coords.speed || 0
        };

        user = smooth(raw.lat, raw.lng);

        let kmh = raw.speed ? (raw.speed * 3.6).toFixed(0) : 0;
        document.getElementById("speed").innerText = kmh + " km/h";

        // USER MARKER
        if(!userMarker){
            userMarker = L.marker([user.lat,user.lng]).addTo(map);
        } else {
            userMarker.setLatLng([user.lat,user.lng]);
        }

        if(driveMode){
            map.setView([user.lat,user.lng], 16);
        }

        // smart reroute
        if(target){
            let now = Date.now();
            if(now - lastRouteTime > 4000){
                updateRoute();
                lastRouteTime = now;
            }
        }

    },{
        enableHighAccuracy:true,
        maximumAge:1000
    });
}

/* ROUTE ENGINE */
async function updateRoute(force=false){

    if(!user || !target) return;

    const url =
`https://router.project-osrm.org/route/v1/driving/
${user.lng},${user.lat};
${target.lng},${target.lat}?overview=full&geometries=geojson`;

    let res = await fetch(url);
    let data = await res.json();

    if(!data.routes || !data.routes.length) return;

    let r = data.routes[0];

    let coords = r.geometry.coordinates.map(c=>[c[1],c[0]]);

    if(routeLine) map.removeLayer(routeLine);

    routeLine = L.polyline(coords,{
        color: "cyan",
        weight: 5
    }).addTo(map);

    let km = (r.distance/1000).toFixed(2);
    let min = Math.round(r.duration/60);

    document.getElementById("info").innerText =
        km + " km • " + min + " min";

    // voice warning
    if(r.distance < 300){
        speak("Du bist sehr nah am Ziel");
    }
}

/* MODES */
function toggleDrive(){
    driveMode = !driveMode;
    speak(driveMode ? "Fahrmodus an" : "aus");
}

function toggleBattery(){
    batteryMode = !batteryMode;
    speak(batteryMode ? "Energiesparmodus an" : "aus");
}

/* SPEECH */
function speak(text){
    let s = new SpeechSynthesisUtterance(text);
    s.lang = "de-DE";
    speechSynthesis.speak(s);
}

/* START */
startGPS();

