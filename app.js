let map = L.map('map').setView([50.11, 8.68], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19
}).addTo(map);

let user = null;
let target = null;
let routeLine = null;

let driveMode = false;
let batteryMode = false;

/* =========================
   GPS SMOOTH ENGINE
========================= */
let state = {lat:0,lng:0,init:false};

function smooth(lat,lng){
    if(!state.init){
        state.lat=lat;
        state.lng=lng;
        state.init=true;
    }

    state.lat = state.lat*0.8 + lat*0.2;
    state.lng = state.lng*0.8 + lng*0.2;

    return {lat:state.lat,lng:state.lng};
}

/* =========================
   MAP CLICK → TARGET
========================= */
map.on("click",e=>{
    target = e.latlng;
    speak("Ziel gesetzt");
    updateRoute();
});

/* =========================
   GPS START
========================= */
function startGPS(){
    navigator.geolocation.watchPosition(pos=>{

        let raw = {
            lat:pos.coords.latitude,
            lng:pos.coords.longitude,
            speed:pos.coords.speed||0
        };

        user = smooth(raw.lat,raw.lng);

        let kmh = (raw.speed*3.6).toFixed(0);
        document.getElementById("speed").innerText = kmh + " km/h";

        if(driveMode){
            map.setView([user.lat,user.lng],16);
        }

        if(target) updateRoute();

    },{
        enableHighAccuracy:true,
        maximumAge:1000
    });
}

/* =========================
   ROUTE ENGINE (AI SCORE)
========================= */
async function updateRoute(){

    if(!user || !target) return;

    const url =
`https://router.project-osrm.org/route/v1/driving/
${user.lng},${user.lat};
${target.lng},${target.lat}?overview=full&geometries=geojson`;

    let res = await fetch(url);
    let data = await res.json();

    if(!data.routes) return;

    let r = data.routes[0];

    let coords = r.geometry.coordinates.map(c=>[c[1],c[0]]);

    if(routeLine) map.removeLayer(routeLine);

    routeLine = L.polyline(coords,{
        color: driveMode ? "cyan" : "red",
        weight:5
    }).addTo(map);

    let km = (r.distance/1000).toFixed(2);
    let min = Math.round(r.duration/60);

    document.getElementById("info").innerText =
        km + " km • " + min + " min";
}

/* =========================
   MODES
========================= */
function toggleDrive(){
    driveMode = !driveMode;
    speak(driveMode ? "Drive Mode an" : "Drive Mode aus");
}

function toggleBattery(){
    batteryMode = !batteryMode;
    speak(batteryMode ? "Battery Mode an" : "aus");
}

/* =========================
   SPEECH
========================= */
function speak(text){
    let s = new SpeechSynthesisUtterance(text);
    s.lang = "de-DE";
    speechSynthesis.speak(s);
}

