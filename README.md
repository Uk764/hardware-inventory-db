# Hardware Inventory Management System

A full-stack Inventory Management and Billing System designed for hardware stores. The system helps manage products, stock levels, barcode generation, billing, and sales tracking efficiently.

## Features

### Authentication
- Secure Admin Login
- JWT Authentication
- Protected Routes

### Inventory Management
- Add New Products
- Update Product Details
- Delete Products
- Search & Filter Products
- Category Management
- Brand Management

### Stock Management
- Real-time Stock Tracking
- Low Stock Alerts
- Stock In/Out Management
- Automatic Inventory Updates

### Barcode System
- Automatic Barcode Generation
- Barcode Printing Support
- Barcode Scanning Integration
- Quick Product Lookup

### Billing System
- Create Sales Bills
- Add Products via Barcode Scan
- Auto Price Calculation
- GST/Tax Support
- Printable Invoices

### Dashboard
- Total Products
- Total Sales
- Low Stock Products
- Revenue Analytics
- Sales Reports

## Technology Stack

### Frontend
- React.js
- React Router
- Axios
- Tailwind CSS
- React Hook Form
- React Hot Toast
- Recharts

### Backend
- Node.js
- Express.js
- PostgreSQL
- JWT Authentication
- Bcrypt.js
- Multer

### Database
- PostgreSQL

## Project Structure

```bash
hardware-store/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   └── server.js
│
└── README.md
```

## Installation

### Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/hardware-store.git
cd hardware-store
```

### Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=hardware_inventory_db

JWT_SECRET=your_secret_key
```
Start Backend:

```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend:

```text
http://localhost:3000
```

Backend:

```text
http://localhost:5000
```

## API Endpoints

### Authentication

#### Login

```http
POST /api/auth/login
```

Request:

```json
{
  "email": "admin@hardwarestore.com",
  "password": "password"
}
```

### Get Current User

```http
GET /api/auth/me
```

## Future Enhancements

- Supplier Management
- Purchase Orders
- GST Reports
- QR Code Support
- Multi-Store Management
- Mobile Application
- Cloud Deployment

## Author

Developed as a Major Project for Inventory and Billing Management of Hardware Stores.

## License

This project is developed for educational and learning purposes.
