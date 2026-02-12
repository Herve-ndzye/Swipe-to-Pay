# SwipeToPay - RFID Payment System

A complete RFID-based payment system with real-time card management, dual-mode transactions (add/remove money), and a modern compact dashboard interface.

## 🌟 Features

- **Dual Transaction Modes**: Add money or remove money from cards
- **Real-time RFID Detection**: Instant card scanning via MQTT
- **Initial Balance**: New cards start with $50.00 default balance
- **Cumulative Transactions**: Add or subtract from existing balance
- **Cardholder Management**: Name assignment for new cards
- **Complete Transaction History**: Track all deposits and withdrawals
- **MongoDB Persistence**: Reliable data storage
- **Modern Compact UI**: Two-column layout with beautified design
- **System Health Monitoring**: Real-time status of MQTT, Backend, and Database
- **Live Statistics**: Payment cards count and total volume tracking

## Team Information

- **Team Name**: Mavics
- **VPS Server**: 157.173.101.159
- **Backend Port**: 8255
- **Frontend Port**: 9255
- **MQTT Broker**: broker.benax.rw:1883
- Whole project access Link : http://157.173.101.159:9255/

## 🚀 Quick Start

### Local Development

#### Manual Start:
```bash
# Terminal 1 - Backend
cd backend
npm install
npm start

# Terminal 2 - Frontend  
cd frontend
npm install
npm start
```

### Configuration

#### Backend (.env)
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/swipetopay?retryWrites=true&w=majority&appName=Cluster0
```

## 📡 MQTT Topics

- `rfid/Mavics/card/status`: ESP8266 publishes card UID and balance when detected
- `rfid/Mavics/card/topup`: Backend publishes balance update commands
- `rfid/Mavics/card/balance`: ESP8266 publishes confirmation of balance update
- `rfid/Mavics/device/status`: MQTT Last Will (online/offline)
- `rfid/Mavics/device/health`: Periodic health metrics (IP, RSSI, Memory)

## 🔌 HTTP API Endpoints

### Health Check
- `GET /health` - System health status (backend, MQTT, database)

### Cards
- `GET /cards` - Get all registered cards
- `GET /card/:uid` - Get specific card details
- `POST /topup` - Add or remove money from card
  - Body: `{ uid, amount, holderName }` 
  - Positive amount = add money
  - Negative amount = remove money
  - `holderName` required for new cards only

### Transactions
- `GET /transactions` - Get all transactions (optional `?limit=100`)
- `GET /transactions/:uid` - Get transaction history for specific card

### WebSocket Events
- `card-status` - Emitted when card is detected
- `card-balance` - Emitted when balance is updated

## 🛠️ Hardware Setup (ESP8266 + RC522)

| RC522 Pin | ESP8266 Pin (NodeMCU) | Function  |
| --------- | --------------------- | --------- |
| 3.3V      | 3V3                   | Power     |
| RST       | D3 (GPIO0)            | Reset     |
| GND       | GND                   | Ground    |
| MISO      | D6 (GPIO12)           | SPI MISO  |
| MOSI      | D7 (GPIO13)           | SPI MOSI  |
| SCK       | D5 (GPIO14)           | SPI Clock |
| SDA (SS)  | D4 (GPIO2)            | SPI SS    |

### Firmware Setup

1. Open `/firmware/rfid_topup_arduino/rfid_topup_arduino.ino` in Arduino IDE
2. Update WiFi credentials:
   ```cpp
   const char* ssid = "YourWiFiSSID";
   const char* password = "YourPassword";
   ```
3. Install required libraries:
   - MFRC522
   - PubSubClient
   - ArduinoJson
   - ESP8266WiFi (built-in)
4. Upload to ESP8266

### Firmware Features
- **WiFi Auto-Reconnect**: Retries 3 times before restart
- **MQTT Reconnection**: Non-blocking with retry limit
- **Health Reporting**: Every 60 seconds
- **Card Detection**: Publishes UID and simulated $50 balance
- **Time Sync**: NTP synchronization for timestamps

## 🎨 Dashboard Features

### Sidebar
- **Branding**: SwipeToPay logo with connection indicator
- **Navigation**: Payment Cards section
- **System Health Monitor**:
  - MQTT Broker status
  - Backend API status  
  - Database connection status
- **Team Info**: Team name and uptime counter

### Main Dashboard (Two-Column Layout)

#### Left Column:
1. **Card Reader Display**
   - Shows active card holder name
   - Displays current balance (large, highlighted)
   - Live status indicator

2. **Transaction Form**
   - **Mode Toggle**: Switch between Add Money 💰 and Remove Money 💸
   - Card holder name input (auto-filled for existing cards)
   - Amount input with quick buttons ($10, $25, $50, $100)
   - Dynamic submit button (changes based on mode)

#### Right Column:
- **Transaction History**
  - Full-height scrollable list
  - Filter dropdown (All, Loads, Payments)
  - Color-coded transactions (green for deposits, red for withdrawals)
  - Shows amount, balance after, and timestamp

#### Top Stats Bar:
- **Payment Cards**: Total registered cards
- **Payment Volume**: Total money in system

## 📊 Database Schema

### Card Collection
```javascript
{
  uid: String (unique),           // RFID card UID
  holderName: String,             // Card holder name
  balance: Number,                // Current balance (starts at $50)
  lastTopup: Number,              // Last transaction amount (absolute value)
  createdAt: Date,                // Card registration date
  updatedAt: Date                 // Last transaction date
}
```

### Transaction Collection
```javascript
{
  uid: String,                    // Card UID
  holderName: String,             // Card holder name
  type: 'topup' | 'debit',       // Transaction type
  amount: Number,                 // Transaction amount (always positive)
  balanceBefore: Number,          // Balance before transaction
  balanceAfter: Number,           // Balance after transaction
  description: String,            // Human-readable description
  timestamp: Date                 // Transaction timestamp
}
```

## 🛠️ Technology Stack

- **Backend**: Node.js, Express, Socket.IO, Mongoose, MQTT (PubSubClient)
- **Frontend**: HTML5, CSS3 (Glass-morphism), Vanilla JavaScript, Socket.IO Client
- **Database**: MongoDB Atlas
- **Hardware**: ESP8266 (NodeMCU), MFRC522 RFID Reader
- **MQTT Broker**: broker.benax.rw

## 🎨 UI Design Features

- **Glass-morphism Effects**: Translucent cards with backdrop blur
- **Gradient Accents**: Color-coded top borders on cards
- **Smooth Animations**: Hover effects, floating icons, pulsing indicators
- **Responsive Design**: Adapts to different screen sizes
- **Mode-Based Styling**: Green for add money, red for remove money
- **Custom Scrollbars**: Styled scrollbar for transaction list
- **Focus States**: Glowing borders on input focus

## 📦 Project Structure

```
SwipeToPay/
├── backend/
│   ├── server.js              # Express + Socket.IO + MQTT server
│   ├── package.json           # Dependencies
│   ├── .env                   # MongoDB URI (gitignored)
│   └── .env.example           # Environment template
├── frontend/
│   ├── index.html             # Main dashboard (compact layout)
│   ├── app.js                 # Frontend logic + mode switching
│   ├── style.css              # Base styles
│   ├── style-new.css          # Beautified compact layout styles
│   ├── config.js              # Auto environment detection
│   ├── server.js              # Express static file server
│   └── package.json           # Dependencies
├── firmware/
│   └── rfid_topup_arduino/
│       └── rfid_topup_arduino.ino  # ESP8266 firmware
└── README.md                  # This file
```

## 🔧 Key Implementation Details

### Initial Balance System
- New cards automatically start with **$50.00**
- First transaction adds to or subtracts from this initial balance
- Example: New card + $10 = $60.00 total balance

### Dual Transaction Mode
- **Add Money Mode**: Sends positive amount to backend
- **Remove Money Mode**: Sends negative amount to backend
- Backend determines transaction type based on amount sign
- UI dynamically updates labels, icons, and button colors

### WiFi Stability
- Implements retry logic (3 attempts) before restart
- Uses lightweight `WiFi.reconnect()` in main loop
- Prevents watchdog timer resets

### MQTT Reliability
- Non-blocking reconnection with retry limit
- Continues operation even if MQTT temporarily unavailable
- Health check endpoint reports connection status

## 🐛 Troubleshooting

### Backend Issues
- **Port in use**: Backend uses port **8255**
- Check MongoDB connection: Verify `.env` file has correct URI with database name
- Test health endpoint: `curl http://localhost:8255/health`

### Frontend Issues
- **Hard refresh**: Press `Ctrl+Shift+R` to clear browser cache
- Verify backend is running on port 8256
- Check browser console for errors
- Ensure `config.js` points to correct backend URL

### Hardware Issues
- **WiFi Loop**: Firmware now retries 3 times before restart
- **MQTT Connection**: Check broker address `broker.benax.rw`
- **Card Not Detected**: Verify RC522 wiring and SPI connections
- Monitor serial output at 115200 baud

### Database Issues
- Ensure MongoDB URI includes database name: `/swipetopay`
- Check connection string has proper parameters
- Verify network access to MongoDB Atlas

## 🔐 Security Notes

- MongoDB credentials stored in `.env` (gitignored)
- CORS enabled for development (restrict in production)
- Use HTTPS in production with reverse proxy
- Validate all user inputs on backend
- MQTT broker should use authentication in production

## 📄 License

MIT

---

**Project**: SwipeToPay RFID Payment System  
**Team**: Mavics  
**Version**: 2.0 (Compact UI with Dual Transaction Modes)
