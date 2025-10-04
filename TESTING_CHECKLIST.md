
# Testing Checklist for Rakeez Platform

## ✅ Backend API Testing

### Authentication
- [ ] Login with admin credentials (admin@rakeez.sa / Rakeez@2025)
- [ ] Login with technician credentials (tech@rakeez.sa / Rakeez@2025)
- [ ] Login with customer credentials (customer1@example.com / Rakeez@2025)
- [ ] Token validation
- [ ] Logout functionality

### Admin Endpoints
- [ ] GET /api/v2/admin/analytics - Dashboard analytics
- [ ] GET /api/v2/admin/bookings - All bookings
- [ ] GET /api/v2/admin/customers - Customer list
- [ ] GET /api/v2/admin/technicians - Technician list
- [ ] GET /api/v2/admin/services - Service management
- [ ] GET /api/v2/admin/spare-parts - Spare parts inventory
- [ ] GET /api/v2/admin/payments - Payment records
- [ ] GET /api/v2/admin/wallets - Wallet management
- [ ] GET /api/v2/admin/brands - Brand management

### Technician Endpoints
- [ ] GET /api/v2/technician/bookings - Assigned bookings
- [ ] GET /api/v2/technician/overview - Performance stats
- [ ] PUT /api/v2/technician/bookings/:id - Update booking status

### Customer Endpoints
- [ ] GET /api/v2/services - Browse services
- [ ] POST /api/v2/bookings - Create booking
- [ ] GET /api/v2/bookings - View bookings
- [ ] GET /api/v2/profile - View profile

## 🎨 Frontend Testing

### Login Page (/login)
- [ ] Admin login form works
- [ ] Technician login form works
- [ ] Customer login form works
- [ ] Error messages display correctly
- [ ] Redirects to appropriate dashboard after login

### Admin Dashboard (/admin/dashboard)
- [ ] Overview page displays analytics
- [ ] Bookings page shows all bookings with filters
- [ ] Customers page lists customers
- [ ] Technicians page lists technicians
- [ ] Services management (CRUD operations)
- [ ] Spare Parts management (CRUD operations)
- [ ] Brands management
- [ ] Payments page shows transaction history
- [ ] Wallets page shows wallet balances
- [ ] Support tickets page
- [ ] Notifications page

### Technician Dashboard (/technician/dashboard)
- [ ] Overview shows assigned bookings
- [ ] Bookings page with status filters
- [ ] Chat functionality
- [ ] File upload functionality

### UI/UX Checks
- [ ] Responsive design works on mobile
- [ ] RTL support for Arabic
- [ ] Loading states display correctly
- [ ] Error states show appropriate messages
- [ ] Success toasts appear
- [ ] Forms validate input
- [ ] Buttons have loading states

## 🔧 Database Testing

### Check Database Connection
```bash
npm run db:push
```

### Seed Test Data
```bash
npm run db:seed
```

### Verify Tables
- [ ] Users table populated
- [ ] Services table populated
- [ ] Bookings table populated
- [ ] Spare parts table populated
- [ ] Brands table populated

## 🌐 WebSocket Testing
- [ ] WebSocket connection establishes
- [ ] Real-time notifications work
- [ ] Chat messages transmit

## 🔒 Security Testing
- [ ] Unauthenticated requests are rejected
- [ ] Role-based access control works
- [ ] Password hashing works (bcrypt)
- [ ] JWT tokens expire correctly

## 📱 Test Credentials

### Admin
- Email: admin@rakeez.sa
- Password: Rakeez@2025

### Technician
- Email: tech@rakeez.sa
- Password: Rakeez@2025

### Customer
- Email: customer1@example.com
- Password: Rakeez@2025

## 🐛 Known Issues to Test
- [ ] Redis availability (currently unavailable - webhook worker disabled)
- [ ] SMTP configuration (email notifications disabled)
- [ ] File upload functionality
- [ ] Payment gateway integration

## 📊 Performance Testing
- [ ] Page load times < 2s
- [ ] API response times < 500ms
- [ ] Database queries optimized
- [ ] No memory leaks

## 🚀 Deployment Testing
- [ ] Build process completes
- [ ] Production mode works
- [ ] Environment variables loaded
- [ ] Static files served correctly
