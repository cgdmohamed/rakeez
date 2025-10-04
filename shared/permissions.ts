export type UserRole = 'customer' | 'technician' | 'admin' | 'support' | 'finance';

export type Permission =
  // User Management
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  
  // Customer Management
  | 'customers.view'
  | 'customers.edit'
  | 'customers.delete'
  
  // Bookings/Orders
  | 'bookings.view'
  | 'bookings.create'
  | 'bookings.edit'
  | 'bookings.delete'
  | 'bookings.assign'
  
  // Financial
  | 'payments.view'
  | 'payments.process'
  | 'payments.refund'
  | 'financial.viewAll'
  | 'financial.reports'
  
  // Support
  | 'support.view'
  | 'support.respond'
  | 'support.close'
  
  // Services
  | 'services.view'
  | 'services.create'
  | 'services.edit'
  | 'services.delete'
  
  // Analytics
  | 'analytics.view'
  | 'analytics.export'
  
  // Technicians
  | 'technicians.view'
  | 'technicians.create'
  | 'technicians.edit'
  | 'technicians.delete';

export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    // Full access to everything
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'customers.view', 'customers.edit', 'customers.delete',
    'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.delete', 'bookings.assign',
    'payments.view', 'payments.process', 'payments.refund',
    'financial.viewAll', 'financial.reports',
    'support.view', 'support.respond', 'support.close',
    'services.view', 'services.create', 'services.edit', 'services.delete',
    'analytics.view', 'analytics.export',
    'technicians.view', 'technicians.create', 'technicians.edit', 'technicians.delete',
  ],
  
  finance: [
    // Financial operations
    'payments.view', 'payments.process', 'payments.refund',
    'financial.viewAll', 'financial.reports',
    'bookings.view',
    'customers.view',
    'analytics.view', 'analytics.export',
  ],
  
  support: [
    // Customer support operations
    'customers.view', 'customers.edit',
    'bookings.view', 'bookings.edit',
    'support.view', 'support.respond', 'support.close',
    'services.view',
  ],
  
  technician: [
    // Technician-specific operations
    'bookings.view',
    'customers.view',
  ],
  
  customer: [
    // Customer-specific operations (minimal)
    'bookings.view',
    'support.view',
  ],
};

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return rolePermissions[userRole]?.includes(permission) || false;
}

export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission));
}

export const roleLabels: Record<UserRole, { en: string; ar: string }> = {
  admin: { en: 'Admin', ar: 'مسؤول' },
  finance: { en: 'Finance', ar: 'محاسب' },
  support: { en: 'Support', ar: 'دعم فني' },
  technician: { en: 'Technician', ar: 'فني' },
  customer: { en: 'Customer', ar: 'عميل' },
};
