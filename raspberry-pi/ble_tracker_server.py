#!/usr/bin/env python3
"""
TrackApp BLE Server voor Raspberry Pi
Auteur: BugraOrhan1
Versie: 1.0
"""

import asyncio
import json
import time
import signal
import sys
from datetime import datetime
from bless import (
    BlessServer,
    BlessGATTCharacteristic,
    GATTCharacteristicProperties,
    GATTAttributePermissions
)

# ============================================================================
# CONFIGURATIE - PAS DEZE WAARDES AAN INDIEN NODIG
# ============================================================================

SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
LOCATION_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8"
COMMAND_CHAR_UUID = "cba1d466-344c-4be3-ab3f-189f80dd7518"
STATUS_CHAR_UUID = "d4e1e2f3-4a5b-6c7d-8e9f-0a1b2c3d4e5f"

DEVICE_NAME = "TrackApp-RPI"
DEVICE_ID = "RPI_001"

# ============================================================================
# TRACKAPP BLE SERVER CLASS
# ============================================================================

class TrackAppBLEServer:
    def __init__(self):
        self.server = None
        self.is_running = False
        
        # Tracking data
        self.location_data = {
            "latitude": 52.0907,      # Default: Amsterdam
            "longitude": 5.1214,
            "timestamp": datetime.now().isoformat(),
            "accuracy": 10.0,
            "speed": 0.0,
            "device_id": DEVICE_ID,
            "source": "rpi"
        }
        
        # Status data
        self.status_data = {
            "status": "ready",
            "tracking_active": False,
            "timestamp": datetime.now().isoformat(),
            "battery": 100,
            "uptime": 0
        }
        
        # Route historie
        self.route_history = []
        self.start_time = time.time()
        
        print("=" * 60)
        print("🚀 TrackApp BLE Server Initialiseren...")
        print("=" * 60)
    
    # ========================================================================
    # CALLBACK FUNCTIES VOOR BLE CHARACTERISTICS
    # ========================================================================
    
    def read_location(self, characteristic: BlessGATTCharacteristic, **kwargs) -> bytearray:
        """Stuurt huidige locatie data naar webapp"""
        self.location_data["timestamp"] = datetime.now().isoformat()
        data = json.dumps(self.location_data)
        
        print(f"📖 [READ] Locatie opgevraagd")
        print(f"   └─ Lat: {self.location_data['latitude']}, Lng: {self.location_data['longitude']}")
        
        return bytearray(data.encode('utf-8'))
    
    def read_status(self, characteristic: BlessGATTCharacteristic, **kwargs) -> bytearray:
        """Stuurt status naar webapp"""
        self.status_data["timestamp"] = datetime.now().isoformat()
        self.status_data["uptime"] = int(time.time() - self.start_time)
        
        data = json.dumps(self.status_data)
        
        print(f"📊 [READ] Status opgevraagd: {self.status_data['status']}")
        
        return bytearray(data.encode('utf-8'))
    
    def write_command(self, characteristic: BlessGATTCharacteristic, value: bytearray, **kwargs):
        """Ontvangt commando's van webapp"""
        try:
            command_str = value.decode('utf-8')
            command = json.loads(command_str)
            
            action = command.get("action", "unknown")
            
            print(f"📥 [WRITE] Commando ontvangen: {action}")
            
            # Route commando's naar juiste handler
            if action == "update_location":
                self._handle_location_update(command)
            elif action == "start_tracking":
                self._handle_start_tracking(command)
            elif action == "stop_tracking":
                self._handle_stop_tracking(command)
            elif action == "get_route":
                self._handle_get_route(command)
            elif action == "clear_route":
                self._handle_clear_route(command)
            else:
                print(f"   ⚠️  Onbekend commando: {action}")
                
        except json.JSONDecodeError as e:
            print(f"❌ [ERROR] JSON parsing fout: {e}")
        except Exception as e:
            print(f"❌ [ERROR] Command verwerking fout: {e}")
    
    # ========================================================================
    # COMMAND HANDLERS
    # ========================================================================
    
    def _handle_location_update(self, command):
        """Verwerk locatie update van webapp"""
        self.location_data.update({
            "latitude": command.get("latitude", self.location_data["latitude"]),
            "longitude": command.get("longitude", self.location_data["longitude"]),
            "timestamp": command.get("timestamp", datetime.now().isoformat()),
            "accuracy": command.get("accuracy", self.location_data["accuracy"]),
            "speed": command.get("speed", 0.0),
            "source": "webapp"
        })
        
        # Voeg toe aan route history als tracking actief is
        if self.status_data["tracking_active"]:
            self.route_history.append({
                "lat": self.location_data["latitude"],
                "lng": self.location_data["longitude"],
                "timestamp": self.location_data["timestamp"]
            })
            
            # Limiteer geschiedenis tot laatste 1000 punten
            if len(self.route_history) > 1000:
                self.route_history.pop(0)
        
        print(f"   ├─ Nieuwe positie: {self.location_data['latitude']:.6f}, {self.location_data['longitude']:.6f}")
        print(f"   ├─ Nauwkeurigheid: {self.location_data['accuracy']:.1f}m")
        print(f"   └─ Route punten: {len(self.route_history)}")
    
    def _handle_start_tracking(self, command):
        """Start tracking modus"""
        self.status_data["tracking_active"] = True
        self.status_data["status"] = "tracking"
        
        print(f"   └─ 🟢 Tracking GESTART")
    
    def _handle_stop_tracking(self, command):
        """Stop tracking modus"""
        self.status_data["tracking_active"] = False
        self.status_data["status"] = "stopped"
        
        print(f"   └─ 🔴 Tracking GESTOPT")
        print(f"       Route punten opgeslagen: {len(self.route_history)}")
    
    def _handle_get_route(self, command):
        """Stuur route history (wordt via read_location opgehaald)"""
        route_data = {
            "route": self.route_history,
            "total_points": len(self.route_history),
            "tracking_active": self.status_data["tracking_active"]
        }
        
        print(f"   └─ 🗺️  Route data opgevraagd: {len(self.route_history)} punten")
        
        # Update location_data tijdelijk met route
        self.location_data["route"] = self.route_history
    
    def _handle_clear_route(self, command):
        """Wis route history"""
        old_count = len(self.route_history)
        self.route_history = []
        
        print(f"   └─ 🗑️  Route gewist: {old_count} punten verwijderd")
    
    # ========================================================================
    # SERVER LIFECYCLE
    # ========================================================================
    
    async def start(self):
        """Start de BLE GATT server"""
        try:
            # Initialiseer BLE server
            self.server = BlessServer(name=DEVICE_NAME)
            self.is_running = True
            
            # Registreer callback functies
            self.server.read_request_func = self._route_read_request
            self.server.write_request_func = self.write_command
            
            # Voeg GATT service toe
            await self.server.add_new_service(SERVICE_UUID)
            print(f"✓ Service toegevoegd: {SERVICE_UUID}")
            
            # Voeg characteristics toe
            # 1. Location (Read + Notify)
            await self.server.add_new_characteristic(
                SERVICE_UUID,
                LOCATION_CHAR_UUID,
                GATTCharacteristicProperties.read | GATTCharacteristicProperties.notify,
                None,
                bytearray(json.dumps(self.location_data).encode('utf-8'))
            )
            print(f"✓ Location characteristic toegevoegd")
            
            # 2. Command (Write)
            await self.server.add_new_characteristic(
                SERVICE_UUID,
                COMMAND_CHAR_UUID,
                GATTCharacteristicProperties.write,
                None,
                bytearray(b'')
            )
            print(f"✓ Command characteristic toegevoegd")
            
            # 3. Status (Read)
            await self.server.add_new_characteristic(
                SERVICE_UUID,
                STATUS_CHAR_UUID,
                GATTCharacteristicProperties.read,
                None,
                bytearray(json.dumps(self.status_data).encode('utf-8'))
            )
            print(f"✓ Status characteristic toegevoegd")
            
            # Start de server
            await self.server.start()
            
            print("=" * 60)
            print(f"✅ TrackApp BLE Server ACTIEF")
            print(f"📱 Device naam: {DEVICE_NAME}")
            print(f"🔑 Service UUID: {SERVICE_UUID}")
            print(f"🎯 Wacht op verbindingen...")
            print("=" * 60)
            print("\n💡 TIP: Druk CTRL+C om te stoppen\n")
            
            # Keep-alive loop
            while self.is_running:
                await asyncio.sleep(1)
                
        except Exception as e:
            print(f"❌ KRITIEKE FOUT bij starten server: {e}")
            self.is_running = False
            raise
    
    async def stop(self):
        """Stop de BLE server netjes"""
        print("\n🛑 Server wordt gestopt...")
        self.is_running = False
        
        if self.server:
            try:
                await self.server.stop()
                print("✓ BLE server gestopt")
            except Exception as e:
                print(f"⚠️  Fout bij stoppen: {e}")
        
        print("=" * 60)
        print(f"📊 SESSIE STATISTIEKEN")
        print(f"   ├─ Uptime: {int(time.time() - self.start_time)}s")
        print(f"   ├─ Route punten: {len(self.route_history)}")
        print(f"   └─ Laatste status: {self.status_data['status']}")
        print("=" * 60)
        print("👋 TrackApp BLE Server afgesloten\n")
    
    def _route_read_request(self, characteristic: BlessGATTCharacteristic, **kwargs) -> bytearray:
        """Route read requests naar juiste handler"""
        char_uuid = str(characteristic.uuid)
        
        if char_uuid.lower() == LOCATION_CHAR_UUID.lower():
            return self.read_location(characteristic, **kwargs)
        elif char_uuid.lower() == STATUS_CHAR_UUID.lower():
            return self.read_status(characteristic, **kwargs)
        else:
            return bytearray(b'{}')

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def signal_handler(sig, frame):
    """Handle CTRL+C gracefully"""
    print("\n\n⚠️  SIGINT ontvangen, server wordt gestopt...")
    sys.exit(0)

async def main():
    """Main async functie"""
    # Setup signal handler
    signal.signal(signal.SIGINT, signal_handler)
    
    # Maak en start server
    server = TrackAppBLEServer()
    
    try:
        await server.start()
    except KeyboardInterrupt:
        print("\n")
    finally:
        await server.stop()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
