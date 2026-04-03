class EmergencyServiceDisplay {
    constructor(options) {
        this.mapId = options.mapId;
        this.alertId = options.alertId;
        this.listId = options.listId;
        this.userPos = null;
        this.userMarker = null;
        this.serviceMarkers = [];
        this.proximityCircles = [];
        this.audio = new Audio("sounds/alert.mp3");

        this.map = L.map(this.mapId).setView([52.1, 5.1], 12);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
        }).addTo(this.map);
    }

    updateUserPosition(lat, lng) {
        this.userPos = { lat, lng };
        if (!this.userMarker) {
            this.userMarker = L.circleMarker([lat, lng], {
                radius: 8,
                color: "#0b5fff",
                fillColor: "#0b5fff",
                fillOpacity: 0.9,
            }).addTo(this.map);
        } else {
            this.userMarker.setLatLng([lat, lng]);
        }
    }

    updateDetections(payload) {
        const detections = (payload && payload.detections) ? payload.detections : [];
        this._clearLayers();
        detections.forEach((detection) => {
            const pos = this._positionFromDetection(detection);
            if (!pos) return;
            this._addServiceMarker(detection, pos);
            this._addProximityCircle(detection, pos);
        });
        this._updateList(detections);

        if (detections.length > 0) {
            this._alert(detections[0]);
        }
    }

    _positionFromDetection(detection) {
        if (!this.userPos) return null;
        const distanceKm = Math.max(0.05, Number(detection.distance_km || 1));
        const bearing = Number(detection.bearing_deg || 0);

        const R = 6371;
        const lat1 = (this.userPos.lat * Math.PI) / 180;
        const lon1 = (this.userPos.lng * Math.PI) / 180;
        const brng = (bearing * Math.PI) / 180;
        const d = distanceKm / R;

        const lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
        );
        const lon2 = lon1 + Math.atan2(
            Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
            Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
        );

        return {
            lat: (lat2 * 180) / Math.PI,
            lng: (lon2 * 180) / Math.PI,
        };
    }

    _addServiceMarker(detection, pos) {
        const icon = detection.emoji || "?";
        const marker = L.marker([pos.lat, pos.lng], {
            icon: L.divIcon({
                className: "service-marker",
                html: `<div class="service-emoji">${icon}</div>`,
                iconSize: [30, 30],
            }),
        }).addTo(this.map);

        marker.bindPopup(
            `${detection.service || "unknown"}<br>${detection.frequency_mhz || "?"} MHz<br>${detection.rssi || "?"} dBm<br>${detection.distance_km || "?"} km`
        );
        this.serviceMarkers.push(marker);
    }

    _addProximityCircle(detection, pos) {
        const distance = Number(detection.distance_km || 1);
        const color = this._distanceColor(distance);
        const circle = L.circle([pos.lat, pos.lng], {
            radius: distance * 1000,
            color,
            fillColor: color,
            fillOpacity: 0.15,
            weight: 2,
        }).addTo(this.map);
        this.proximityCircles.push(circle);
    }

    _distanceColor(distanceKm) {
        if (distanceKm < 1) return "#ff1744";
        if (distanceKm < 5) return "#ff8f00";
        if (distanceKm < 15) return "#ffd600";
        return "#00c853";
    }

    _updateList(detections) {
        const list = document.getElementById(this.listId);
        if (!list) return;
        if (!detections.length) {
            list.innerHTML = '<div class="empty-row">Geen detecties</div>';
            return;
        }

        const rows = detections
            .slice()
            .sort((a, b) => Number(a.distance_km || 0) - Number(b.distance_km || 0))
            .map(
                (d) =>
                    `<div class="det-row service-${d.service || "unknown"}"><span>${d.emoji || "?"}</span><span>${d.service || "unknown"}</span><span>${Number(d.distance_km || 0).toFixed(2)} km</span><span>${Number(d.frequency_mhz || 0).toFixed(3)} MHz</span><span>${Number(d.rssi || 0).toFixed(1)} dBm</span></div>`
            )
            .join("");

        list.innerHTML = rows;
    }

    _alert(detection) {
        const alert = document.getElementById(this.alertId);
        if (!alert) return;
        const service = detection.service || "onbekend";
        const distance = Number(detection.distance_km || 0).toFixed(1);
        alert.textContent = `Hulpdienst: ${service} op ${distance} km`;
        alert.classList.add("show-alert");
        setTimeout(() => alert.classList.remove("show-alert"), 3500);

        this.audio.currentTime = 0;
        this.audio.play().catch(() => this._beepFallback());

        if (window.speechSynthesis) {
            const utter = new SpeechSynthesisUtterance(`${service}, ${distance} kilometer`);
            utter.lang = "nl-NL";
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utter);
        }

        if (navigator.vibrate) {
            navigator.vibrate([150, 100, 150]);
        }
    }

    _clearLayers() {
        this.serviceMarkers.forEach((m) => this.map.removeLayer(m));
        this.proximityCircles.forEach((c) => this.map.removeLayer(c));
        this.serviceMarkers = [];
        this.proximityCircles = [];
    }

    _beepFallback() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const context = new AudioContextClass();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = 880;
        gain.gain.value = 0.05;
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
            context.close().catch(() => {});
        }, 180);
    }
}

window.EmergencyServiceDisplay = EmergencyServiceDisplay;
